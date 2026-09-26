use crate::auth::DbState;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct SesionPlanInput {
    pub descripcion: Option<String>,
    pub contenido: Option<String>,
}

#[derive(Deserialize)]
pub struct FasePlanInput {
    pub nombre: Option<String>,
    pub sesiones: Vec<SesionPlanInput>,
}

#[derive(Deserialize)]
pub struct PropuestaInput {
    pub objetivo_general: Option<String>,
    pub objetivos_especificos: Vec<String>,
    pub modalidad: Option<String>,
    pub frecuencia: Option<String>,
    pub duracion_sesion_minutos: Option<String>,
    pub duracion_estimada_tratamiento: Option<String>,
    pub fases: Vec<FasePlanInput>,
}

#[derive(Serialize)]
pub struct SesionPlanDetalle {
    pub descripcion: Option<String>,
    pub contenido: Option<String>,
}

#[derive(Serialize)]
pub struct FasePlanDetalle {
    pub nombre: Option<String>,
    pub sesiones: Vec<SesionPlanDetalle>,
}

#[derive(Serialize)]
pub struct PropuestaDetalle {
    pub objetivo_general: Option<String>,
    pub objetivos_especificos: Vec<String>,
    pub modalidad: Option<String>,
    pub frecuencia: Option<String>,
    pub duracion_sesion_minutos: Option<String>,
    pub duracion_estimada_tratamiento: Option<String>,
    pub fases: Vec<FasePlanDetalle>,
}

#[tauri::command]
pub fn obtener_propuesta(state: State<DbState>, paciente_id: i64) -> Result<PropuestaDetalle, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let propuesta_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM propuestas WHERE paciente_id = ?1",
            params![paciente_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("error consultando la propuesta: {e}"))?;

    let Some(propuesta_id) = propuesta_id else {
        return Ok(PropuestaDetalle {
            objetivo_general: None,
            objetivos_especificos: Vec::new(),
            modalidad: None,
            frecuencia: None,
            duracion_sesion_minutos: None,
            duracion_estimada_tratamiento: None,
            fases: Vec::new(),
        });
    };

    let (objetivo_general, modalidad, frecuencia, duracion_sesion_minutos, duracion_estimada_tratamiento): (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT objetivo_general, modalidad, frecuencia, duracion_sesion_minutos, duracion_estimada_tratamiento
             FROM propuestas WHERE id = ?1",
            params![propuesta_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .map_err(|e| format!("error consultando la propuesta: {e}"))?;

    let mut stmt_objetivos = conn
        .prepare(
            "SELECT texto FROM propuesta_objetivos_especificos WHERE propuesta_id = ?1 ORDER BY orden ASC",
        )
        .map_err(|e| format!("error preparando la consulta de objetivos: {e}"))?;
    let objetivos_especificos = stmt_objetivos
        .query_map(params![propuesta_id], |row| row.get(0))
        .map_err(|e| format!("error consultando objetivos: {e}"))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("error leyendo objetivos: {e}"))?;

    let mut stmt_fases = conn
        .prepare("SELECT id, nombre FROM propuesta_fases WHERE propuesta_id = ?1 ORDER BY orden ASC")
        .map_err(|e| format!("error preparando la consulta de fases: {e}"))?;
    let fases_filas = stmt_fases
        .query_map(params![propuesta_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?))
        })
        .map_err(|e| format!("error consultando fases: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo fases: {e}"))?;

    let mut fases = Vec::new();
    for (fase_id, nombre) in fases_filas {
        let mut stmt_sesiones = conn
            .prepare(
                "SELECT descripcion, contenido FROM propuesta_sesiones WHERE fase_id = ?1 ORDER BY orden ASC",
            )
            .map_err(|e| format!("error preparando la consulta de sesiones: {e}"))?;
        let sesiones = stmt_sesiones
            .query_map(params![fase_id], |row| {
                Ok(SesionPlanDetalle {
                    descripcion: row.get(0)?,
                    contenido: row.get(1)?,
                })
            })
            .map_err(|e| format!("error consultando sesiones: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("error leyendo sesiones: {e}"))?;

        fases.push(FasePlanDetalle { nombre, sesiones });
    }

    Ok(PropuestaDetalle {
        objetivo_general,
        objetivos_especificos,
        modalidad,
        frecuencia,
        duracion_sesion_minutos,
        duracion_estimada_tratamiento,
        fases,
    })
}

#[tauri::command]
pub fn guardar_propuesta(
    state: State<DbState>,
    paciente_id: i64,
    propuesta: PropuestaInput,
) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar el guardado: {e}"))?;

    let propuesta_id: Option<i64> = tx
        .query_row(
            "SELECT id FROM propuestas WHERE paciente_id = ?1",
            params![paciente_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("error consultando la propuesta: {e}"))?;

    let propuesta_id = match propuesta_id {
        Some(id) => {
            tx.execute(
                "UPDATE propuestas SET objetivo_general = ?1, modalidad = ?2, frecuencia = ?3,
                    duracion_sesion_minutos = ?4, duracion_estimada_tratamiento = ?5, actualizado_en = datetime('now')
                 WHERE id = ?6",
                params![
                    propuesta.objetivo_general,
                    propuesta.modalidad,
                    propuesta.frecuencia,
                    propuesta.duracion_sesion_minutos,
                    propuesta.duracion_estimada_tratamiento,
                    id,
                ],
            )
            .map_err(|e| format!("no se pudo actualizar la propuesta: {e}"))?;
            id
        }
        None => {
            tx.execute(
                "INSERT INTO propuestas (paciente_id, objetivo_general, modalidad, frecuencia,
                    duracion_sesion_minutos, duracion_estimada_tratamiento)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    paciente_id,
                    propuesta.objetivo_general,
                    propuesta.modalidad,
                    propuesta.frecuencia,
                    propuesta.duracion_sesion_minutos,
                    propuesta.duracion_estimada_tratamiento,
                ],
            )
            .map_err(|e| format!("no se pudo crear la propuesta: {e}"))?;
            tx.last_insert_rowid()
        }
    };

    tx.execute(
        "DELETE FROM propuesta_sesiones WHERE fase_id IN (SELECT id FROM propuesta_fases WHERE propuesta_id = ?1)",
        params![propuesta_id],
    )
    .map_err(|e| format!("no se pudieron reemplazar las sesiones: {e}"))?;
    tx.execute("DELETE FROM propuesta_fases WHERE propuesta_id = ?1", params![propuesta_id])
        .map_err(|e| format!("no se pudieron reemplazar las fases: {e}"))?;
    tx.execute(
        "DELETE FROM propuesta_objetivos_especificos WHERE propuesta_id = ?1",
        params![propuesta_id],
    )
    .map_err(|e| format!("no se pudieron reemplazar los objetivos: {e}"))?;

    for (indice, texto) in propuesta.objetivos_especificos.iter().enumerate() {
        tx.execute(
            "INSERT INTO propuesta_objetivos_especificos (propuesta_id, texto, orden) VALUES (?1, ?2, ?3)",
            params![propuesta_id, texto, indice as i64],
        )
        .map_err(|e| format!("no se pudo guardar un objetivo específico: {e}"))?;
    }

    for (indice_fase, fase) in propuesta.fases.iter().enumerate() {
        tx.execute(
            "INSERT INTO propuesta_fases (propuesta_id, nombre, orden) VALUES (?1, ?2, ?3)",
            params![propuesta_id, fase.nombre, indice_fase as i64],
        )
        .map_err(|e| format!("no se pudo guardar una fase: {e}"))?;
        let fase_id = tx.last_insert_rowid();

        for (indice_sesion, sesion) in fase.sesiones.iter().enumerate() {
            tx.execute(
                "INSERT INTO propuesta_sesiones (fase_id, descripcion, contenido, orden) VALUES (?1, ?2, ?3, ?4)",
                params![fase_id, sesion.descripcion, sesion.contenido, indice_sesion as i64],
            )
            .map_err(|e| format!("no se pudo guardar una sesión: {e}"))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar el guardado: {e}"))?;

    Ok(())
}
