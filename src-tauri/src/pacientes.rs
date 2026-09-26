use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct PacienteInput {
    pub apellidos_nombres: String,
    pub edad: Option<i64>,
    pub sexo: Option<String>,
    pub fecha_nacimiento: String,
    pub lugar_nacimiento: Option<String>,
    pub grado_instruccion: Option<String>,
    pub ocupacion: Option<String>,
    pub estado_civil: Option<String>,
    pub num_hijos: Option<i64>,
    pub num_hermanos: Option<i64>,
    pub vive_con: Option<String>,
    pub domicilio: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub nombre_acompanante: Option<String>,
    pub fecha_consulta: String,
}

#[derive(Serialize)]
pub struct PacienteResumen {
    pub id: i64,
    pub apellidos_nombres: String,
    pub edad: Option<i64>,
    pub telefono: Option<String>,
    pub fecha_consulta: String,
}

#[derive(Serialize)]
pub struct PacienteDetalle {
    pub id: i64,
    pub apellidos_nombres: String,
    pub edad: Option<i64>,
    pub sexo: Option<String>,
    pub fecha_nacimiento: String,
    pub lugar_nacimiento: Option<String>,
    pub grado_instruccion: Option<String>,
    pub ocupacion: Option<String>,
    pub estado_civil: Option<String>,
    pub num_hijos: Option<i64>,
    pub num_hermanos: Option<i64>,
    pub vive_con: Option<String>,
    pub domicilio: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub nombre_acompanante: Option<String>,
    pub fecha_consulta: String,
}

#[tauri::command]
pub fn crear_paciente(state: State<DbState>, paciente: PacienteInput) -> Result<i64, String> {
    if paciente.apellidos_nombres.trim().is_empty() {
        return Err("apellidos y nombres es obligatorio".to_string());
    }
    if paciente.fecha_nacimiento.trim().is_empty() {
        return Err("fecha de nacimiento es obligatoria".to_string());
    }
    if paciente.fecha_consulta.trim().is_empty() {
        return Err("fecha de consulta es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO pacientes (
            apellidos_nombres, edad, sexo, fecha_nacimiento, lugar_nacimiento,
            grado_instruccion, ocupacion, estado_civil, num_hijos, num_hermanos,
            vive_con, domicilio, telefono, email, nombre_acompanante, fecha_consulta
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            paciente.apellidos_nombres,
            paciente.edad,
            paciente.sexo,
            paciente.fecha_nacimiento,
            paciente.lugar_nacimiento,
            paciente.grado_instruccion,
            paciente.ocupacion,
            paciente.estado_civil,
            paciente.num_hijos,
            paciente.num_hermanos,
            paciente.vive_con,
            paciente.domicilio,
            paciente.telefono,
            paciente.email,
            paciente.nombre_acompanante,
            paciente.fecha_consulta,
        ],
    )
    .map_err(|e| format!("no se pudo guardar el paciente: {e}"))?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn listar_pacientes(
    state: State<DbState>,
    busqueda: Option<String>,
) -> Result<Vec<PacienteResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filtro = busqueda.unwrap_or_default().trim().to_lowercase();
    let patron = format!("%{filtro}%");

    let mut stmt = conn
        .prepare(
            "SELECT id, apellidos_nombres, edad, telefono, fecha_consulta
             FROM pacientes
             WHERE ?1 = '' OR LOWER(apellidos_nombres) LIKE ?2
             ORDER BY apellidos_nombres ASC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![filtro, patron], |row| {
            Ok(PacienteResumen {
                id: row.get(0)?,
                apellidos_nombres: row.get(1)?,
                edad: row.get(2)?,
                telefono: row.get(3)?,
                fecha_consulta: row.get(4)?,
            })
        })
        .map_err(|e| format!("error consultando pacientes: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo pacientes: {e}"))
}

#[tauri::command]
pub fn obtener_paciente(state: State<DbState>, id: i64) -> Result<PacienteDetalle, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.query_row(
        "SELECT id, apellidos_nombres, edad, sexo, fecha_nacimiento, lugar_nacimiento,
                grado_instruccion, ocupacion, estado_civil, num_hijos, num_hermanos,
                vive_con, domicilio, telefono, email, nombre_acompanante, fecha_consulta
         FROM pacientes WHERE id = ?1",
        params![id],
        |row| {
            Ok(PacienteDetalle {
                id: row.get(0)?,
                apellidos_nombres: row.get(1)?,
                edad: row.get(2)?,
                sexo: row.get(3)?,
                fecha_nacimiento: row.get(4)?,
                lugar_nacimiento: row.get(5)?,
                grado_instruccion: row.get(6)?,
                ocupacion: row.get(7)?,
                estado_civil: row.get(8)?,
                num_hijos: row.get(9)?,
                num_hermanos: row.get(10)?,
                vive_con: row.get(11)?,
                domicilio: row.get(12)?,
                telefono: row.get(13)?,
                email: row.get(14)?,
                nombre_acompanante: row.get(15)?,
                fecha_consulta: row.get(16)?,
            })
        },
    )
    .map_err(|_| "paciente no encontrado".to_string())
}

#[tauri::command]
pub fn actualizar_paciente(
    state: State<DbState>,
    id: i64,
    paciente: PacienteInput,
) -> Result<(), String> {
    if paciente.apellidos_nombres.trim().is_empty() {
        return Err("apellidos y nombres es obligatorio".to_string());
    }
    if paciente.fecha_nacimiento.trim().is_empty() {
        return Err("fecha de nacimiento es obligatoria".to_string());
    }
    if paciente.fecha_consulta.trim().is_empty() {
        return Err("fecha de consulta es obligatoria".to_string());
    }

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let filas = conn
        .execute(
            "UPDATE pacientes SET
                apellidos_nombres = ?1, edad = ?2, sexo = ?3, fecha_nacimiento = ?4, lugar_nacimiento = ?5,
                grado_instruccion = ?6, ocupacion = ?7, estado_civil = ?8, num_hijos = ?9, num_hermanos = ?10,
                vive_con = ?11, domicilio = ?12, telefono = ?13, email = ?14, nombre_acompanante = ?15,
                fecha_consulta = ?16, actualizado_en = datetime('now')
             WHERE id = ?17",
            params![
                paciente.apellidos_nombres,
                paciente.edad,
                paciente.sexo,
                paciente.fecha_nacimiento,
                paciente.lugar_nacimiento,
                paciente.grado_instruccion,
                paciente.ocupacion,
                paciente.estado_civil,
                paciente.num_hijos,
                paciente.num_hermanos,
                paciente.vive_con,
                paciente.domicilio,
                paciente.telefono,
                paciente.email,
                paciente.nombre_acompanante,
                paciente.fecha_consulta,
                id,
            ],
        )
        .map_err(|e| format!("no se pudo actualizar el paciente: {e}"))?;

    if filas == 0 {
        return Err("paciente no encontrado".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn eliminar_paciente(state: State<DbState>, id: i64) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar la eliminación: {e}"))?;

    tx.execute("DELETE FROM citas WHERE paciente_id = ?1", params![id])
        .map_err(|e| format!("no se pudieron eliminar las citas del paciente: {e}"))?;
    tx.execute(
        "DELETE FROM sesiones_seguimiento WHERE paciente_id = ?1",
        params![id],
    )
    .map_err(|e| format!("no se pudieron eliminar las sesiones del paciente: {e}"))?;
    tx.execute(
        "DELETE FROM test_resultado_respuestas WHERE resultado_id IN
            (SELECT id FROM test_resultados WHERE paciente_id = ?1)",
        params![id],
    )
    .map_err(|e| format!("no se pudieron eliminar las respuestas de evaluaciones del paciente: {e}"))?;
    tx.execute(
        "DELETE FROM test_resultados WHERE paciente_id = ?1",
        params![id],
    )
    .map_err(|e| format!("no se pudieron eliminar las evaluaciones del paciente: {e}"))?;

    let filas = tx
        .execute("DELETE FROM pacientes WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el paciente: {e}"))?;

    if filas == 0 {
        return Err("paciente no encontrado".to_string());
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar la eliminación: {e}"))?;

    Ok(())
}
