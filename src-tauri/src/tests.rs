use crate::auth::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Deserialize)]
pub struct RangoInput {
    pub puntaje_min: i64,
    pub puntaje_max: i64,
    pub etiqueta: String,
}

#[derive(Deserialize)]
pub struct TestInput {
    pub nombre: String,
    pub descripcion: Option<String>,
    pub preguntas: Vec<String>,
    pub rangos: Vec<RangoInput>,
}

#[derive(Serialize)]
pub struct TestResumen {
    pub id: i64,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub cantidad_preguntas: i64,
}

#[derive(Serialize)]
pub struct PreguntaDetalle {
    pub id: i64,
    pub texto: String,
}

#[derive(Serialize)]
pub struct RangoDetalle {
    pub id: i64,
    pub puntaje_min: i64,
    pub puntaje_max: i64,
    pub etiqueta: String,
}

#[derive(Serialize)]
pub struct TestDetalle {
    pub id: i64,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub preguntas: Vec<PreguntaDetalle>,
    pub rangos: Vec<RangoDetalle>,
}

#[derive(Deserialize)]
pub struct ResultadoInput {
    pub paciente_id: i64,
    pub test_id: i64,
    pub respuestas: Vec<i64>,
}

#[derive(Serialize)]
pub struct ResultadoResumen {
    pub id: i64,
    pub test_nombre: String,
    pub fecha_hora: String,
    pub puntaje_total: i64,
    pub diagnostico: Option<String>,
}

#[derive(Serialize)]
pub struct RespuestaDetalle {
    pub pregunta_texto: String,
    pub valor: i64,
}

#[derive(Serialize)]
pub struct ResultadoDetalle {
    pub id: i64,
    pub test_nombre: String,
    pub fecha_hora: String,
    pub puntaje_total: i64,
    pub diagnostico: Option<String>,
    pub respuestas: Vec<RespuestaDetalle>,
}

fn validar_test_input(input: &TestInput) -> Result<(), String> {
    if input.nombre.trim().is_empty() {
        return Err("el nombre del test es obligatorio".to_string());
    }
    if input.preguntas.is_empty() || input.preguntas.iter().any(|p| p.trim().is_empty()) {
        return Err("el test debe tener al menos una pregunta y ninguna puede estar vacía".to_string());
    }
    if input.rangos.is_empty() || input.rangos.iter().any(|r| r.etiqueta.trim().is_empty()) {
        return Err("el test debe tener al menos un rango de diagnóstico con etiqueta".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn crear_test(state: State<DbState>, test: TestInput) -> Result<i64, String> {
    validar_test_input(&test)?;

    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar la creación: {e}"))?;

    tx.execute(
        "INSERT INTO tests (nombre, descripcion) VALUES (?1, ?2)",
        params![test.nombre, test.descripcion],
    )
    .map_err(|e| format!("no se pudo guardar el test: {e}"))?;

    let test_id = tx.last_insert_rowid();

    for (indice, texto) in test.preguntas.iter().enumerate() {
        tx.execute(
            "INSERT INTO test_preguntas (test_id, texto, orden) VALUES (?1, ?2, ?3)",
            params![test_id, texto, indice as i64],
        )
        .map_err(|e| format!("no se pudo guardar una pregunta: {e}"))?;
    }

    for rango in &test.rangos {
        tx.execute(
            "INSERT INTO test_rangos (test_id, puntaje_min, puntaje_max, etiqueta) VALUES (?1, ?2, ?3, ?4)",
            params![test_id, rango.puntaje_min, rango.puntaje_max, rango.etiqueta],
        )
        .map_err(|e| format!("no se pudo guardar un rango de diagnóstico: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar la creación: {e}"))?;

    Ok(test_id)
}

#[tauri::command]
pub fn listar_tests(state: State<DbState>) -> Result<Vec<TestResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.nombre, t.descripcion,
                    (SELECT COUNT(*) FROM test_preguntas p WHERE p.test_id = t.id)
             FROM tests t
             ORDER BY t.nombre ASC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map([], |row| {
            Ok(TestResumen {
                id: row.get(0)?,
                nombre: row.get(1)?,
                descripcion: row.get(2)?,
                cantidad_preguntas: row.get(3)?,
            })
        })
        .map_err(|e| format!("error consultando tests: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo tests: {e}"))
}

#[tauri::command]
pub fn obtener_test(state: State<DbState>, id: i64) -> Result<TestDetalle, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (nombre, descripcion): (String, Option<String>) = conn
        .query_row(
            "SELECT nombre, descripcion FROM tests WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "test no encontrado".to_string())?;

    let mut stmt_preguntas = conn
        .prepare("SELECT id, texto FROM test_preguntas WHERE test_id = ?1 ORDER BY orden ASC")
        .map_err(|e| format!("error preparando la consulta de preguntas: {e}"))?;
    let preguntas = stmt_preguntas
        .query_map(params![id], |row| {
            Ok(PreguntaDetalle {
                id: row.get(0)?,
                texto: row.get(1)?,
            })
        })
        .map_err(|e| format!("error consultando preguntas: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo preguntas: {e}"))?;

    let mut stmt_rangos = conn
        .prepare(
            "SELECT id, puntaje_min, puntaje_max, etiqueta FROM test_rangos
             WHERE test_id = ?1 ORDER BY puntaje_min ASC",
        )
        .map_err(|e| format!("error preparando la consulta de rangos: {e}"))?;
    let rangos = stmt_rangos
        .query_map(params![id], |row| {
            Ok(RangoDetalle {
                id: row.get(0)?,
                puntaje_min: row.get(1)?,
                puntaje_max: row.get(2)?,
                etiqueta: row.get(3)?,
            })
        })
        .map_err(|e| format!("error consultando rangos: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo rangos: {e}"))?;

    Ok(TestDetalle {
        id,
        nombre,
        descripcion,
        preguntas,
        rangos,
    })
}

#[tauri::command]
pub fn actualizar_test(state: State<DbState>, id: i64, test: TestInput) -> Result<(), String> {
    validar_test_input(&test)?;

    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar la actualización: {e}"))?;

    let filas = tx
        .execute(
            "UPDATE tests SET nombre = ?1, descripcion = ?2, actualizado_en = datetime('now') WHERE id = ?3",
            params![test.nombre, test.descripcion, id],
        )
        .map_err(|e| format!("no se pudo actualizar el test: {e}"))?;

    if filas == 0 {
        return Err("test no encontrado".to_string());
    }

    tx.execute("DELETE FROM test_preguntas WHERE test_id = ?1", params![id])
        .map_err(|e| format!("no se pudieron reemplazar las preguntas: {e}"))?;
    tx.execute("DELETE FROM test_rangos WHERE test_id = ?1", params![id])
        .map_err(|e| format!("no se pudieron reemplazar los rangos: {e}"))?;

    for (indice, texto) in test.preguntas.iter().enumerate() {
        tx.execute(
            "INSERT INTO test_preguntas (test_id, texto, orden) VALUES (?1, ?2, ?3)",
            params![id, texto, indice as i64],
        )
        .map_err(|e| format!("no se pudo guardar una pregunta: {e}"))?;
    }

    for rango in &test.rangos {
        tx.execute(
            "INSERT INTO test_rangos (test_id, puntaje_min, puntaje_max, etiqueta) VALUES (?1, ?2, ?3, ?4)",
            params![id, rango.puntaje_min, rango.puntaje_max, rango.etiqueta],
        )
        .map_err(|e| format!("no se pudo guardar un rango de diagnóstico: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar la actualización: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn eliminar_test(state: State<DbState>, id: i64) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar la eliminación: {e}"))?;

    tx.execute("DELETE FROM test_preguntas WHERE test_id = ?1", params![id])
        .map_err(|e| format!("no se pudieron eliminar las preguntas del test: {e}"))?;
    tx.execute("DELETE FROM test_rangos WHERE test_id = ?1", params![id])
        .map_err(|e| format!("no se pudieron eliminar los rangos del test: {e}"))?;

    let filas = tx
        .execute("DELETE FROM tests WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el test: {e}"))?;

    if filas == 0 {
        return Err("test no encontrado".to_string());
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar la eliminación: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn registrar_resultado(state: State<DbState>, resultado: ResultadoInput) -> Result<i64, String> {
    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (test_nombre,): (String,) = conn
        .query_row(
            "SELECT nombre FROM tests WHERE id = ?1",
            params![resultado.test_id],
            |row| Ok((row.get(0)?,)),
        )
        .map_err(|_| "test no encontrado".to_string())?;

    let mut stmt_preguntas = conn
        .prepare("SELECT texto FROM test_preguntas WHERE test_id = ?1 ORDER BY orden ASC")
        .map_err(|e| format!("error preparando la consulta de preguntas: {e}"))?;
    let preguntas: Vec<String> = stmt_preguntas
        .query_map(params![resultado.test_id], |row| row.get(0))
        .map_err(|e| format!("error consultando preguntas: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo preguntas: {e}"))?;
    drop(stmt_preguntas);

    if preguntas.len() != resultado.respuestas.len() {
        return Err("la cantidad de respuestas no coincide con la cantidad de preguntas del test".to_string());
    }

    let puntaje_total: i64 = resultado.respuestas.iter().sum();

    let diagnostico: Option<String> = conn
        .query_row(
            "SELECT etiqueta FROM test_rangos
             WHERE test_id = ?1 AND ?2 BETWEEN puntaje_min AND puntaje_max
             LIMIT 1",
            params![resultado.test_id, puntaje_total],
            |row| row.get(0),
        )
        .ok();

    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar el registro: {e}"))?;

    tx.execute(
        "INSERT INTO test_resultados (paciente_id, test_id, test_nombre, fecha_hora, puntaje_total, diagnostico)
         VALUES (?1, ?2, ?3, datetime('now'), ?4, ?5)",
        params![
            resultado.paciente_id,
            resultado.test_id,
            test_nombre,
            puntaje_total,
            diagnostico,
        ],
    )
    .map_err(|e| format!("no se pudo guardar el resultado: {e}"))?;

    let resultado_id = tx.last_insert_rowid();

    for (texto, valor) in preguntas.iter().zip(resultado.respuestas.iter()) {
        tx.execute(
            "INSERT INTO test_resultado_respuestas (resultado_id, pregunta_texto, valor) VALUES (?1, ?2, ?3)",
            params![resultado_id, texto, valor],
        )
        .map_err(|e| format!("no se pudo guardar una respuesta: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar el registro: {e}"))?;

    Ok(resultado_id)
}

#[tauri::command]
pub fn listar_resultados_paciente(
    state: State<DbState>,
    paciente_id: i64,
) -> Result<Vec<ResultadoResumen>, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, test_nombre, fecha_hora, puntaje_total, diagnostico
             FROM test_resultados
             WHERE paciente_id = ?1
             ORDER BY fecha_hora DESC",
        )
        .map_err(|e| format!("error preparando la consulta: {e}"))?;

    let filas = stmt
        .query_map(params![paciente_id], |row| {
            Ok(ResultadoResumen {
                id: row.get(0)?,
                test_nombre: row.get(1)?,
                fecha_hora: row.get(2)?,
                puntaje_total: row.get(3)?,
                diagnostico: row.get(4)?,
            })
        })
        .map_err(|e| format!("error consultando resultados: {e}"))?;

    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo resultados: {e}"))
}

#[tauri::command]
pub fn obtener_resultado(state: State<DbState>, id: i64) -> Result<ResultadoDetalle, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let (test_nombre, fecha_hora, puntaje_total, diagnostico): (String, String, i64, Option<String>) = conn
        .query_row(
            "SELECT test_nombre, fecha_hora, puntaje_total, diagnostico FROM test_resultados WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| "resultado no encontrado".to_string())?;

    let mut stmt = conn
        .prepare("SELECT pregunta_texto, valor FROM test_resultado_respuestas WHERE resultado_id = ?1")
        .map_err(|e| format!("error preparando la consulta de respuestas: {e}"))?;
    let respuestas = stmt
        .query_map(params![id], |row| {
            Ok(RespuestaDetalle {
                pregunta_texto: row.get(0)?,
                valor: row.get(1)?,
            })
        })
        .map_err(|e| format!("error consultando respuestas: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("error leyendo respuestas: {e}"))?;

    Ok(ResultadoDetalle {
        id,
        test_nombre,
        fecha_hora,
        puntaje_total,
        diagnostico,
        respuestas,
    })
}

#[tauri::command]
pub fn eliminar_resultado(state: State<DbState>, id: i64) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("no se pudo iniciar la eliminación: {e}"))?;

    tx.execute(
        "DELETE FROM test_resultado_respuestas WHERE resultado_id = ?1",
        params![id],
    )
    .map_err(|e| format!("no se pudieron eliminar las respuestas del resultado: {e}"))?;

    let filas = tx
        .execute("DELETE FROM test_resultados WHERE id = ?1", params![id])
        .map_err(|e| format!("no se pudo eliminar el resultado: {e}"))?;

    if filas == 0 {
        return Err("resultado no encontrado".to_string());
    }

    tx.commit()
        .map_err(|e| format!("no se pudo confirmar la eliminación: {e}"))?;

    Ok(())
}
