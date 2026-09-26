use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct CitaInput {
    pub paciente_id: i64,
    pub fecha_hora_inicio: String,
    pub fecha_hora_fin: Option<String>,
    pub notas: Option<String>,
}

#[derive(Deserialize)]
pub struct CitaActualizarInput {
    pub fecha_hora_inicio: String,
    pub notas: Option<String>,
}

#[derive(Serialize)]
pub struct CitaConPaciente {
    pub id: i64,
    pub paciente_id: i64,
    pub paciente_nombre: String,
    pub fecha_hora_inicio: String,
    pub fecha_hora_fin: Option<String>,
    pub estado: String,
    pub notas: Option<String>,
}

#[tauri::command]
pub fn crear_cita(state: State<DbState>, cita: CitaInput) -> Result<i64, String> {
    if cita.fecha_hora_inicio.trim().is_empty() {
        return Err("fecha y hora de la cita es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO citas (paciente_id, fecha_hora_inicio, fecha_hora_fin, estado, notas)
         VALUES (?1, ?2, ?3, 'Programada', ?4)",
        params![cita.paciente_id, cita.fecha_hora_inicio, cita.fecha_hora_fin, cita.notas],
    )
    .map_err(|e| format!("no se pudo agendar la cita: {e}"))?;

    let id = conn.last_insert_rowid();

    if let Ok(nombre) = conn.query_row(
        "SELECT apellidos_nombres FROM pacientes WHERE id = ?1",
        params![cita.paciente_id],
        |row| row.get::<_, String>(0),
    ) {
        crate::google_calendar::sincronizar_cita(&conn, id, &cita.fecha_hora_inicio, cita.notas.as_deref(), &nombre);
    }

    Ok(id)
}

/// Lista las citas cuyo `fecha_hora_inicio` cae dentro de un mes calendario,
/// dado como prefijo ISO `YYYY-MM` (evita depender de un tipo de fecha en SQLite).
#[tauri::command]
pub fn listar_citas_mes(
    state: State<DbState>,
    anio_mes: String,
) -> Result<Vec<CitaConPaciente>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let patron = format!("{anio_mes}%");

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.paciente_id, p.apellidos_nombres, c.fecha_hora_inicio,
                    c.fecha_hora_fin, c.estado, c.notas
             FROM citas c
             JOIN pacientes p ON p.id = c.paciente_id
             WHERE c.fecha_hora_inicio LIKE ?1
             ORDER BY c.fecha_hora_inicio ASC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![patron], |row| {
            Ok(CitaConPaciente {
                id: row.get(0)?,
                paciente_id: row.get(1)?,
                paciente_nombre: row.get(2)?,
                fecha_hora_inicio: row.get(3)?,
                fecha_hora_fin: row.get(4)?,
                estado: row.get(5)?,
                notas: row.get(6)?,
            })
        })
        .map_err(|e| format!("error consultando citas: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo citas: {e}"))
}

/// Reprograma una cita (cambia fecha/hora y notas). Si estaba cancelada, vuelve a quedar Programada.
#[tauri::command]
pub fn actualizar_cita(
    state: State<DbState>,
    id: i64,
    cita: CitaActualizarInput,
) -> Result<(), String> {
    if cita.fecha_hora_inicio.trim().is_empty() {
        return Err("fecha y hora de la cita es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute(
            "UPDATE citas SET fecha_hora_inicio = ?1, notas = ?2, estado = 'Programada' WHERE id = ?3",
            params![cita.fecha_hora_inicio, cita.notas, id],
        )
        .map_err(|e| format!("no se pudo reprogramar la cita: {e}"))?;

    if filas == 0 {
        return Err("cita no encontrada".to_string());
    }

    if let Ok(nombre) = conn.query_row(
        "SELECT p.apellidos_nombres FROM citas c JOIN pacientes p ON p.id = c.paciente_id WHERE c.id = ?1",
        params![id],
        |row| row.get::<_, String>(0),
    ) {
        crate::google_calendar::sincronizar_cita(&conn, id, &cita.fecha_hora_inicio, cita.notas.as_deref(), &nombre);
    }

    Ok(())
}

/// Lista todas las citas registradas de un paciente, de la más reciente a la más antigua.
#[tauri::command]
pub fn listar_citas_paciente(
    state: State<DbState>,
    paciente_id: i64,
) -> Result<Vec<CitaConPaciente>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.paciente_id, p.apellidos_nombres, c.fecha_hora_inicio,
                    c.fecha_hora_fin, c.estado, c.notas
             FROM citas c
             JOIN pacientes p ON p.id = c.paciente_id
             WHERE c.paciente_id = ?1
             ORDER BY c.fecha_hora_inicio DESC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(CitaConPaciente {
                id: row.get(0)?,
                paciente_id: row.get(1)?,
                paciente_nombre: row.get(2)?,
                fecha_hora_inicio: row.get(3)?,
                fecha_hora_fin: row.get(4)?,
                estado: row.get(5)?,
                notas: row.get(6)?,
            })
        })
        .map_err(|e| format!("error consultando citas: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo citas: {e}"))
}

#[tauri::command]
pub fn cancelar_cita(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "UPDATE citas SET estado = 'Cancelada' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("no se pudo cancelar la cita: {e}"))?;

    crate::google_calendar::eliminar_evento_de_cita(&conn, id);

    Ok(())
}

#[tauri::command]
pub fn eliminar_cita(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    crate::google_calendar::eliminar_evento_de_cita(&conn, id);

    let filas = conn
        .execute("DELETE FROM citas WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar la cita: {e}"))?;

    if filas == 0 {
        return Err("cita no encontrada".to_string());
    }

    Ok(())
}
