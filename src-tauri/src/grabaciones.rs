use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

use crate::auth::DbState;

/// Límite de seguridad: no está pensado como un límite de duración exacto,
/// solo evita que un archivo corrupto o desmedido llene el disco del cliente.
const TAMANO_MAXIMO_BYTES: usize = 300 * 1024 * 1024;

#[derive(Serialize)]
pub struct GrabacionResumen {
    pub id: i64,
    pub nombre: String,
    pub tamano_bytes: i64,
    pub creado_en: String,
}

fn carpeta_grabaciones(app: &AppHandle, paciente_id: i64) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "no se pudo resolver el directorio de datos de la app".to_string())?;
    let carpeta = app_dir.join("grabaciones").join(format!("paciente_{paciente_id}"));
    fs::create_dir_all(&carpeta).map_err(|e| format!("no se pudo crear el directorio de grabaciones: {e}"))?;
    Ok(carpeta)
}

#[tauri::command]
pub fn listar_grabaciones(
    state: State<DbState>,
    paciente_id: i64,
) -> Result<Vec<GrabacionResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, nombre, tamano_bytes, creado_en FROM grabaciones
             WHERE paciente_id = ?1 ORDER BY creado_en DESC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(GrabacionResumen {
                id: row.get(0)?,
                nombre: row.get(1)?,
                tamano_bytes: row.get(2)?,
                creado_en: row.get(3)?,
            })
        })
        .map_err(|e| format!("error consultando grabaciones: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo grabaciones: {e}"))
}

#[tauri::command]
pub fn crear_grabacion(
    app: AppHandle,
    state: State<DbState>,
    paciente_id: i64,
    nombre: String,
    datos_base64: String,
) -> Result<GrabacionResumen, String> {
    let nombre = nombre.trim().to_string();
    if nombre.is_empty() {
        return Err("el nombre de la grabación es obligatorio".to_string());
    }

    let datos = STANDARD
        .decode(datos_base64.as_bytes())
        .map_err(|e| format!("no se pudo leer el audio grabado: {e}"))?;

    if datos.is_empty() {
        return Err("la grabación está vacía".to_string());
    }
    if datos.len() > TAMANO_MAXIMO_BYTES {
        return Err("la grabación supera el tamaño máximo permitido de 300 MB".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO grabaciones (paciente_id, nombre, nombre_archivo, tamano_bytes) VALUES (?1, ?2, '', ?3)",
        params![paciente_id, nombre, datos.len() as i64],
    )
    .map_err(|e| format!("no se pudo registrar la grabación: {e}"))?;

    let id = conn.last_insert_rowid();
    let nombre_archivo = format!("{id}.webm");

    let carpeta = carpeta_grabaciones(&app, paciente_id)?;
    if let Err(e) = fs::write(carpeta.join(&nombre_archivo), &datos) {
        conn.execute("DELETE FROM grabaciones WHERE id = ?1", params![id]).ok();
        return Err(format!("no se pudo guardar el archivo de audio: {e}"));
    }

    conn.execute(
        "UPDATE grabaciones SET nombre_archivo = ?1 WHERE id = ?2",
        params![nombre_archivo, id],
    )
    .map_err(|e| format!("no se pudo finalizar el registro de la grabación: {e}"))?;

    let creado_en: String = conn
        .query_row("SELECT creado_en FROM grabaciones WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| format!("no se pudo leer la grabación guardada: {e}"))?;

    Ok(GrabacionResumen {
        id,
        nombre,
        tamano_bytes: datos.len() as i64,
        creado_en,
    })
}

#[tauri::command]
pub fn renombrar_grabacion(state: State<DbState>, id: i64, nombre: String) -> Result<(), String> {
    let nombre = nombre.trim().to_string();
    if nombre.is_empty() {
        return Err("el nombre de la grabación es obligatorio".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute("UPDATE grabaciones SET nombre = ?1 WHERE id = ?2", params![nombre, id])
        .map_err(|e| format!("no se pudo renombrar la grabación: {e}"))?;

    if filas == 0 {
        return Err("grabación no encontrada".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn obtener_ruta_grabacion(app: AppHandle, state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (paciente_id, nombre_archivo): (i64, String) = conn
        .query_row(
            "SELECT paciente_id, nombre_archivo FROM grabaciones WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "grabación no encontrada".to_string())?;

    let carpeta = carpeta_grabaciones(&app, paciente_id)?;
    let ruta = carpeta.join(nombre_archivo);
    ruta.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "no se pudo resolver la ruta de la grabación".to_string())
}

#[tauri::command]
pub fn eliminar_grabacion(app: AppHandle, state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (paciente_id, nombre_archivo): (i64, String) = conn
        .query_row(
            "SELECT paciente_id, nombre_archivo FROM grabaciones WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "grabación no encontrada".to_string())?;

    let filas = conn
        .execute("DELETE FROM grabaciones WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar la grabación: {e}"))?;

    if filas == 0 {
        return Err("grabación no encontrada".to_string());
    }

    let carpeta = carpeta_grabaciones(&app, paciente_id)?;
    fs::remove_file(carpeta.join(nombre_archivo)).ok();

    Ok(())
}
