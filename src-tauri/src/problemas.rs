use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct ProblemaInput {
    pub paciente_id: i64,
    pub nombre: String,
}

#[derive(Deserialize)]
pub struct ProblemaActualizarInput {
    pub nombre: String,
    pub ant_situacionales: Option<String>,
    pub ant_fisiologicos: Option<String>,
    pub ant_cognitivos: Option<String>,
    pub conducta_fisiologicos: Option<String>,
    pub conducta_cognitivos: Option<String>,
    pub conducta_motoras: Option<String>,
    pub conducta_medicion: Option<String>,
    pub consec_situacionales: Option<String>,
    pub consec_fisiologicos: Option<String>,
    pub consec_cognitivos: Option<String>,
    pub diag_exceso: Option<String>,
    pub diag_debilitamiento: Option<String>,
    pub diag_deficit: Option<String>,
}

#[derive(Serialize)]
pub struct ProblemaResumen {
    pub id: i64,
    pub nombre: String,
}

#[derive(Serialize)]
pub struct ProblemaDetalle {
    pub id: i64,
    pub paciente_id: i64,
    pub nombre: String,
    pub ant_situacionales: Option<String>,
    pub ant_fisiologicos: Option<String>,
    pub ant_cognitivos: Option<String>,
    pub conducta_fisiologicos: Option<String>,
    pub conducta_cognitivos: Option<String>,
    pub conducta_motoras: Option<String>,
    pub conducta_medicion: Option<String>,
    pub consec_situacionales: Option<String>,
    pub consec_fisiologicos: Option<String>,
    pub consec_cognitivos: Option<String>,
    pub diag_exceso: Option<String>,
    pub diag_debilitamiento: Option<String>,
    pub diag_deficit: Option<String>,
}

#[tauri::command]
pub fn crear_problema(state: State<DbState>, problema: ProblemaInput) -> Result<i64, String> {
    if problema.nombre.trim().is_empty() {
        return Err("el nombre del problema es obligatorio".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO analisis_funcional_problemas (paciente_id, nombre) VALUES (?1, ?2)",
        params![problema.paciente_id, problema.nombre],
    )
    .map_err(|e| format!("no se pudo crear el problema: {e}"))?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn listar_problemas(
    state: State<DbState>,
    paciente_id: i64,
) -> Result<Vec<ProblemaResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, nombre FROM analisis_funcional_problemas
             WHERE paciente_id = ?1
             ORDER BY id ASC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(ProblemaResumen {
                id: row.get(0)?,
                nombre: row.get(1)?,
            })
        })
        .map_err(|e| format!("error consultando problemas: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo problemas: {e}"))
}

#[tauri::command]
pub fn obtener_problema(state: State<DbState>, id: i64) -> Result<ProblemaDetalle, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.query_row(
        "SELECT id, paciente_id, nombre, ant_situacionales, ant_fisiologicos, ant_cognitivos,
                conducta_fisiologicos, conducta_cognitivos, conducta_motoras, conducta_medicion,
                consec_situacionales, consec_fisiologicos, consec_cognitivos,
                diag_exceso, diag_debilitamiento, diag_deficit
         FROM analisis_funcional_problemas WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProblemaDetalle {
                id: row.get(0)?,
                paciente_id: row.get(1)?,
                nombre: row.get(2)?,
                ant_situacionales: row.get(3)?,
                ant_fisiologicos: row.get(4)?,
                ant_cognitivos: row.get(5)?,
                conducta_fisiologicos: row.get(6)?,
                conducta_cognitivos: row.get(7)?,
                conducta_motoras: row.get(8)?,
                conducta_medicion: row.get(9)?,
                consec_situacionales: row.get(10)?,
                consec_fisiologicos: row.get(11)?,
                consec_cognitivos: row.get(12)?,
                diag_exceso: row.get(13)?,
                diag_debilitamiento: row.get(14)?,
                diag_deficit: row.get(15)?,
            })
        },
    )
    .map_err(|e| format!("no se pudo obtener el problema: {e}"))
}

#[tauri::command]
pub fn actualizar_problema(
    state: State<DbState>,
    id: i64,
    problema: ProblemaActualizarInput,
) -> Result<(), String> {
    if problema.nombre.trim().is_empty() {
        return Err("el nombre del problema es obligatorio".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute(
            "UPDATE analisis_funcional_problemas SET
                nombre = ?1,
                ant_situacionales = ?2, ant_fisiologicos = ?3, ant_cognitivos = ?4,
                conducta_fisiologicos = ?5, conducta_cognitivos = ?6, conducta_motoras = ?7, conducta_medicion = ?8,
                consec_situacionales = ?9, consec_fisiologicos = ?10, consec_cognitivos = ?11,
                diag_exceso = ?12, diag_debilitamiento = ?13, diag_deficit = ?14
             WHERE id = ?15",
            params![
                problema.nombre,
                problema.ant_situacionales,
                problema.ant_fisiologicos,
                problema.ant_cognitivos,
                problema.conducta_fisiologicos,
                problema.conducta_cognitivos,
                problema.conducta_motoras,
                problema.conducta_medicion,
                problema.consec_situacionales,
                problema.consec_fisiologicos,
                problema.consec_cognitivos,
                problema.diag_exceso,
                problema.diag_debilitamiento,
                problema.diag_deficit,
                id,
            ],
        )
        .map_err(|e| format!("no se pudo actualizar el problema: {e}"))?;

    if filas == 0 {
        return Err("problema no encontrado".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn eliminar_problema(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute("DELETE FROM analisis_funcional_problemas WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el problema: {e}"))?;

    if filas == 0 {
        return Err("problema no encontrado".to_string());
    }

    Ok(())
}
