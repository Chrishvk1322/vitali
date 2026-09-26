use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

#[derive(Deserialize)]
pub struct SesionInput {
    pub paciente_id: i64,
    pub fecha_hora: String,
    pub resumen_tratado: Option<String>,
    pub observaciones: Option<String>,
    pub tareas: Option<String>,
}

#[derive(Deserialize)]
pub struct SesionActualizarInput {
    pub fecha_hora: String,
    pub resumen_tratado: Option<String>,
    pub observaciones: Option<String>,
    pub tareas: Option<String>,
}

#[derive(Serialize)]
pub struct SesionResumen {
    pub id: i64,
    pub fecha_hora: String,
    pub resumen_tratado: Option<String>,
    pub observaciones: Option<String>,
    pub tareas: Option<String>,
}

#[tauri::command]
pub fn crear_sesion(state: State<DbState>, sesion: SesionInput) -> Result<i64, String> {
    if sesion.fecha_hora.trim().is_empty() {
        return Err("fecha y hora de la sesión es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO sesiones_seguimiento (paciente_id, fecha_hora, resumen_tratado, observaciones, tareas)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            sesion.paciente_id,
            sesion.fecha_hora,
            sesion.resumen_tratado,
            sesion.observaciones,
            sesion.tareas,
        ],
    )
    .map_err(|e| format!("no se pudo guardar la sesión: {e}"))?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn listar_sesiones(state: State<DbState>, paciente_id: i64) -> Result<Vec<SesionResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, fecha_hora, resumen_tratado, observaciones, tareas
             FROM sesiones_seguimiento
             WHERE paciente_id = ?1
             ORDER BY fecha_hora DESC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(SesionResumen {
                id: row.get(0)?,
                fecha_hora: row.get(1)?,
                resumen_tratado: row.get(2)?,
                observaciones: row.get(3)?,
                tareas: row.get(4)?,
            })
        })
        .map_err(|e| format!("error consultando sesiones: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo sesiones: {e}"))
}

/// Actualiza el contenido de una sesión, incluyendo su fecha de registro.
#[tauri::command]
pub fn actualizar_sesion(
    state: State<DbState>,
    id: i64,
    sesion: SesionActualizarInput,
) -> Result<(), String> {
    if sesion.fecha_hora.trim().is_empty() {
        return Err("fecha de la sesión es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute(
            "UPDATE sesiones_seguimiento SET fecha_hora = ?1, resumen_tratado = ?2, observaciones = ?3, tareas = ?4
             WHERE id = ?5",
            params![sesion.fecha_hora, sesion.resumen_tratado, sesion.observaciones, sesion.tareas, id],
        )
        .map_err(|e| format!("no se pudo actualizar la sesión: {e}"))?;

    if filas == 0 {
        return Err("sesión no encontrada".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn eliminar_sesion(app: AppHandle, state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    crate::adjuntos::eliminar_adjuntos_de_sesion(&app, &conn, id)?;

    let filas = conn
        .execute("DELETE FROM sesiones_seguimiento WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar la sesión: {e}"))?;

    if filas == 0 {
        return Err("sesión no encontrada".to_string());
    }

    Ok(())
}
