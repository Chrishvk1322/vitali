use crate::auth::DbState;
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

const EXTENSIONES_PERMITIDAS: [&str; 4] = ["pdf", "jpg", "jpeg", "png"];
const TAMANO_MAXIMO_BYTES: u64 = 20 * 1024 * 1024;

#[derive(Serialize)]
pub struct AdjuntoResumen {
    pub id: i64,
    pub nombre_original: String,
    pub tamano_bytes: i64,
    pub creado_en: String,
}

fn carpeta_adjuntos(app: &AppHandle, sesion_id: i64) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "no se pudo resolver el directorio de datos de la app".to_string())?;
    let carpeta = app_dir.join("adjuntos").join(format!("sesion_{sesion_id}"));
    fs::create_dir_all(&carpeta).map_err(|e| format!("no se pudo crear el directorio de adjuntos: {e}"))?;
    Ok(carpeta)
}

/// Elimina del disco y de la base de datos todos los adjuntos de una sesión.
/// Se usa al eliminar la sesión, para que no queden archivos huérfanos.
pub fn eliminar_adjuntos_de_sesion(
    app: &AppHandle,
    conn: &rusqlite::Connection,
    sesion_id: i64,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT nombre_archivo FROM sesion_adjuntos WHERE sesion_id = ?1")
        .map_err(|e| format!("error preparando la consulta de adjuntos: {e}"))?;
    let nombres_archivo = stmt
        .query_map(params![sesion_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("error consultando adjuntos: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo adjuntos: {e}"))?;
    drop(stmt);

    if !nombres_archivo.is_empty() {
        let carpeta = carpeta_adjuntos(app, sesion_id)?;
        for nombre_archivo in nombres_archivo {
            fs::remove_file(carpeta.join(nombre_archivo)).ok();
        }
    }

    conn.execute("DELETE FROM sesion_adjuntos WHERE sesion_id = ?1", params![sesion_id])
        .map_err(|e| format!("no se pudieron eliminar los adjuntos de la sesión: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn listar_adjuntos_sesion(
    state: State<DbState>,
    sesion_id: i64,
) -> Result<Vec<AdjuntoResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, nombre_original, tamano_bytes, creado_en FROM sesion_adjuntos
             WHERE sesion_id = ?1 ORDER BY creado_en ASC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![sesion_id], |row| {
            Ok(AdjuntoResumen {
                id: row.get(0)?,
                nombre_original: row.get(1)?,
                tamano_bytes: row.get(2)?,
                creado_en: row.get(3)?,
            })
        })
        .map_err(|e| format!("error consultando adjuntos: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo adjuntos: {e}"))
}

#[tauri::command]
pub fn agregar_adjunto_sesion(
    app: AppHandle,
    state: State<DbState>,
    sesion_id: i64,
    ruta_origen: String,
) -> Result<AdjuntoResumen, String> {
    let origen = Path::new(&ruta_origen);

    let nombre_original = origen
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "no se pudo leer el nombre del archivo".to_string())?
        .to_string();

    let extension = origen
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .ok_or_else(|| "el archivo no tiene una extensión válida".to_string())?;

    if !EXTENSIONES_PERMITIDAS.contains(&extension.as_str()) {
        return Err("solo se permiten archivos PDF o imágenes (jpg/png)".to_string());
    }

    let metadata = fs::metadata(origen).map_err(|e| format!("no se pudo leer el archivo: {e}"))?;
    if metadata.len() > TAMANO_MAXIMO_BYTES {
        return Err("el archivo supera el tamaño máximo permitido de 20 MB".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO sesion_adjuntos (sesion_id, nombre_original, nombre_archivo, tamano_bytes)
         VALUES (?1, ?2, '', ?3)",
        params![sesion_id, nombre_original, metadata.len() as i64],
    )
    .map_err(|e| format!("no se pudo registrar el adjunto: {e}"))?;

    let id = conn.last_insert_rowid();
    let nombre_archivo = format!("{id}.{extension}");

    let carpeta = carpeta_adjuntos(&app, sesion_id)?;
    let destino = carpeta.join(&nombre_archivo);
    if let Err(e) = fs::copy(origen, &destino) {
        conn.execute("DELETE FROM sesion_adjuntos WHERE id = ?1", params![id]).ok();
        return Err(format!("no se pudo copiar el archivo: {e}"));
    }

    conn.execute(
        "UPDATE sesion_adjuntos SET nombre_archivo = ?1 WHERE id = ?2",
        params![nombre_archivo, id],
    )
    .map_err(|e| format!("no se pudo finalizar el registro del adjunto: {e}"))?;

    let creado_en: String = conn
        .query_row(
            "SELECT creado_en FROM sesion_adjuntos WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("no se pudo leer el adjunto guardado: {e}"))?;

    Ok(AdjuntoResumen {
        id,
        nombre_original,
        tamano_bytes: metadata.len() as i64,
        creado_en,
    })
}

#[tauri::command]
pub fn obtener_ruta_adjunto(app: AppHandle, state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (sesion_id, nombre_archivo): (i64, String) = conn
        .query_row(
            "SELECT sesion_id, nombre_archivo FROM sesion_adjuntos WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "adjunto no encontrado".to_string())?;

    let carpeta = carpeta_adjuntos(&app, sesion_id)?;
    let ruta = carpeta.join(nombre_archivo);
    ruta.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "no se pudo resolver la ruta del adjunto".to_string())
}

#[tauri::command]
pub fn eliminar_adjunto(app: AppHandle, state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (sesion_id, nombre_archivo): (i64, String) = conn
        .query_row(
            "SELECT sesion_id, nombre_archivo FROM sesion_adjuntos WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "adjunto no encontrado".to_string())?;

    let filas = conn
        .execute("DELETE FROM sesion_adjuntos WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el adjunto: {e}"))?;

    if filas == 0 {
        return Err("adjunto no encontrado".to_string());
    }

    let carpeta = carpeta_adjuntos(&app, sesion_id)?;
    fs::remove_file(carpeta.join(nombre_archivo)).ok();

    Ok(())
}
