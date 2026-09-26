use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

use crate::auth::DbState;

const TAMANO_MAXIMO_BYTES: u64 = 20 * 1024 * 1024;

#[derive(Serialize)]
pub struct RecursoResumen {
    pub id: i64,
    pub nombre_original: String,
    pub tamano_bytes: i64,
    pub creado_en: String,
}

fn carpeta_recursos(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "no se pudo resolver el directorio de datos de la app".to_string())?;
    let carpeta = app_dir.join("recursos");
    fs::create_dir_all(&carpeta).map_err(|e| format!("no se pudo crear el directorio de recursos: {e}"))?;
    Ok(carpeta)
}

#[tauri::command]
pub fn listar_recursos(
    state: State<DbState>,
    busqueda: String,
) -> Result<Vec<RecursoResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let patron = format!("%{}%", busqueda.trim());

    let mut stmt = conn
        .prepare(
            "SELECT id, nombre_original, tamano_bytes, creado_en FROM recursos
             WHERE nombre_original LIKE ?1 ORDER BY creado_en DESC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![patron], |row| {
            Ok(RecursoResumen {
                id: row.get(0)?,
                nombre_original: row.get(1)?,
                tamano_bytes: row.get(2)?,
                creado_en: row.get(3)?,
            })
        })
        .map_err(|e| format!("error consultando recursos: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo recursos: {e}"))
}

#[tauri::command]
pub fn agregar_recurso(
    app: AppHandle,
    state: State<DbState>,
    ruta_origen: String,
) -> Result<RecursoResumen, String> {
    let origen = Path::new(&ruta_origen);

    let nombre_original = origen
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "no se pudo leer el nombre del archivo".to_string())?
        .to_string();

    let extension = origen
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    if extension.as_deref() != Some("pdf") {
        return Err("solo se permiten archivos PDF".to_string());
    }

    let metadata = fs::metadata(origen).map_err(|e| format!("no se pudo leer el archivo: {e}"))?;
    if metadata.len() > TAMANO_MAXIMO_BYTES {
        return Err("el archivo supera el tamaño máximo permitido de 20 MB".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO recursos (nombre_original, nombre_archivo, tamano_bytes) VALUES (?1, '', ?2)",
        params![nombre_original, metadata.len() as i64],
    )
    .map_err(|e| format!("no se pudo registrar el recurso: {e}"))?;

    let id = conn.last_insert_rowid();
    let nombre_archivo = format!("{id}.pdf");

    let carpeta = carpeta_recursos(&app)?;
    let destino = carpeta.join(&nombre_archivo);
    if let Err(e) = fs::copy(origen, &destino) {
        conn.execute("DELETE FROM recursos WHERE id = ?1", params![id]).ok();
        return Err(format!("no se pudo copiar el archivo: {e}"));
    }

    conn.execute(
        "UPDATE recursos SET nombre_archivo = ?1 WHERE id = ?2",
        params![nombre_archivo, id],
    )
    .map_err(|e| format!("no se pudo finalizar el registro del recurso: {e}"))?;

    let creado_en: String = conn
        .query_row("SELECT creado_en FROM recursos WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| format!("no se pudo leer el recurso guardado: {e}"))?;

    Ok(RecursoResumen {
        id,
        nombre_original,
        tamano_bytes: metadata.len() as i64,
        creado_en,
    })
}

#[tauri::command]
pub fn obtener_ruta_recurso(app: AppHandle, state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let nombre_archivo: String = conn
        .query_row(
            "SELECT nombre_archivo FROM recursos WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| "recurso no encontrado".to_string())?;

    let carpeta = carpeta_recursos(&app)?;
    let ruta = carpeta.join(nombre_archivo);
    ruta.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "no se pudo resolver la ruta del recurso".to_string())
}

#[tauri::command]
pub fn eliminar_recurso(app: AppHandle, state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let nombre_archivo: String = conn
        .query_row(
            "SELECT nombre_archivo FROM recursos WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| "recurso no encontrado".to_string())?;

    let filas = conn
        .execute("DELETE FROM recursos WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el recurso: {e}"))?;

    if filas == 0 {
        return Err("recurso no encontrado".to_string());
    }

    let carpeta = carpeta_recursos(&app)?;
    fs::remove_file(carpeta.join(nombre_archivo)).ok();

    Ok(())
}
