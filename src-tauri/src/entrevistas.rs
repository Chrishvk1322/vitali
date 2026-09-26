use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct RespuestaEntrevistaInput {
    pub pregunta_codigo: String,
    pub respuesta: Option<String>,
}

#[derive(Serialize)]
pub struct RespuestaEntrevista {
    pub pregunta_codigo: String,
    pub respuesta: Option<String>,
}

#[tauri::command]
pub fn obtener_entrevista(
    state: State<DbState>,
    paciente_id: i64,
) -> Result<Vec<RespuestaEntrevista>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT pregunta_codigo, respuesta FROM entrevista_respuestas WHERE paciente_id = ?1",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(RespuestaEntrevista {
                pregunta_codigo: row.get(0)?,
                respuesta: row.get(1)?,
            })
        })
        .map_err(|e| format!("error consultando la entrevista: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo la entrevista: {e}"))
}

#[tauri::command]
pub fn guardar_entrevista(
    state: State<DbState>,
    paciente_id: i64,
    respuestas: Vec<RespuestaEntrevistaInput>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    for respuesta in respuestas {
        conn.execute(
            "INSERT INTO entrevista_respuestas (paciente_id, pregunta_codigo, respuesta)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(paciente_id, pregunta_codigo) DO UPDATE SET respuesta = excluded.respuesta",
            params![paciente_id, respuesta.pregunta_codigo, respuesta.respuesta],
        )
        .map_err(|e| format!("no se pudo guardar la entrevista: {e}"))?;
    }

    Ok(())
}
