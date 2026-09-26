use rusqlite::Connection;
use std::fs;
use tauri::{AppHandle, Manager};

pub const SEED_ADMIN_USERNAME: &str = "admin";
pub const SEED_ADMIN_PASSWORD: &str = "admin123";

pub fn init_db(app_handle: &AppHandle) -> rusqlite::Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("no se pudo resolver el directorio de datos de la app");
    fs::create_dir_all(&app_dir).expect("no se pudo crear el directorio de datos de la app");

    let db_path = app_dir.join("clinica.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    run_migrations(&conn)?;
    seed_initial_data(&conn)?;

    Ok(conn)
}

fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            nombres TEXT NOT NULL,
            rol_id INTEGER NOT NULL REFERENCES roles(id),
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            apellidos_nombres TEXT NOT NULL,
            edad INTEGER,
            sexo TEXT,
            fecha_nacimiento TEXT NOT NULL,
            lugar_nacimiento TEXT,
            grado_instruccion TEXT,
            ocupacion TEXT,
            estado_civil TEXT,
            num_hijos INTEGER,
            num_hermanos INTEGER,
            vive_con TEXT,
            domicilio TEXT,
            telefono TEXT,
            email TEXT,
            nombre_acompanante TEXT,
            fecha_consulta TEXT NOT NULL,
            creado_en TEXT NOT NULL DEFAULT (datetime('now')),
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sesiones_seguimiento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            fecha_hora TEXT NOT NULL,
            resumen_tratado TEXT,
            observaciones TEXT,
            tareas TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            fecha_hora_inicio TEXT NOT NULL,
            fecha_hora_fin TEXT,
            estado TEXT NOT NULL DEFAULT 'Programada',
            notas TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now')),
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS test_preguntas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL REFERENCES tests(id),
            texto TEXT NOT NULL,
            orden INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS test_rangos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL REFERENCES tests(id),
            puntaje_min INTEGER NOT NULL,
            puntaje_max INTEGER NOT NULL,
            etiqueta TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS test_resultados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            test_id INTEGER NOT NULL,
            test_nombre TEXT NOT NULL,
            fecha_hora TEXT NOT NULL,
            puntaje_total INTEGER NOT NULL,
            diagnostico TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS test_resultado_respuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resultado_id INTEGER NOT NULL REFERENCES test_resultados(id),
            pregunta_texto TEXT NOT NULL,
            valor INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analisis_funcional_problemas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            nombre TEXT NOT NULL,
            ant_situacionales TEXT,
            ant_fisiologicos TEXT,
            ant_cognitivos TEXT,
            conducta_fisiologicos TEXT,
            conducta_cognitivos TEXT,
            conducta_motoras TEXT,
            conducta_medicion TEXT,
            consec_situacionales TEXT,
            consec_fisiologicos TEXT,
            consec_cognitivos TEXT,
            diag_exceso TEXT,
            diag_debilitamiento TEXT,
            diag_deficit TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS entrevista_respuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            pregunta_codigo TEXT NOT NULL,
            respuesta TEXT,
            UNIQUE(paciente_id, pregunta_codigo)
        );

        CREATE TABLE IF NOT EXISTS propuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL UNIQUE REFERENCES pacientes(id),
            objetivo_general TEXT,
            modalidad TEXT,
            frecuencia TEXT,
            duracion_sesion_minutos TEXT,
            duracion_estimada_tratamiento TEXT,
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS propuesta_objetivos_especificos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            propuesta_id INTEGER NOT NULL REFERENCES propuestas(id),
            texto TEXT NOT NULL,
            orden INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS propuesta_fases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            propuesta_id INTEGER NOT NULL REFERENCES propuestas(id),
            nombre TEXT,
            orden INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS propuesta_sesiones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fase_id INTEGER NOT NULL REFERENCES propuesta_fases(id),
            descripcion TEXT,
            contenido TEXT,
            orden INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recursos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_original TEXT NOT NULL,
            nombre_archivo TEXT NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sesion_adjuntos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sesion_id INTEGER NOT NULL REFERENCES sesiones_seguimiento(id),
            nombre_original TEXT NOT NULL,
            nombre_archivo TEXT NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS grabaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
            nombre TEXT NOT NULL,
            nombre_archivo TEXT NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            creado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS google_calendar_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            client_id TEXT NOT NULL DEFAULT '',
            client_secret TEXT NOT NULL DEFAULT '',
            access_token TEXT NOT NULL DEFAULT '',
            refresh_token TEXT NOT NULL DEFAULT '',
            token_expira_en TEXT NOT NULL DEFAULT '1970-01-01T00:00:00Z',
            calendar_id TEXT NOT NULL DEFAULT '',
            cuenta_email TEXT NOT NULL DEFAULT '',
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )?;

    agregar_columna_si_falta(conn, "sesiones_seguimiento", "tareas", "TEXT")?;
    agregar_columna_si_falta(conn, "citas", "google_event_id", "TEXT")
}

/// Agrega una columna a una tabla ya existente si todavía no la tiene, para no
/// romper bases de datos creadas por versiones anteriores de la app.
fn agregar_columna_si_falta(
    conn: &Connection,
    tabla: &str,
    columna: &str,
    tipo_sql: &str,
) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({tabla})"))?;
    let existe = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .any(|nombre| nombre == columna);

    if !existe {
        conn.execute_batch(&format!("ALTER TABLE {tabla} ADD COLUMN {columna} {tipo_sql}"))?;
    }

    Ok(())
}

fn seed_initial_data(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO roles (nombre) VALUES ('psicologo'), ('admin')",
        [],
    )?;

    let usuarios_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM usuarios", [], |row| row.get(0))?;

    if usuarios_count == 0 {
        let admin_rol_id: i64 = conn.query_row(
            "SELECT id FROM roles WHERE nombre = 'admin'",
            [],
            |row| row.get(0),
        )?;

        let password_hash = bcrypt::hash(SEED_ADMIN_PASSWORD, bcrypt::DEFAULT_COST)
            .expect("no se pudo generar el hash de la contraseña sembrada");

        conn.execute(
            "INSERT INTO usuarios (username, password_hash, nombres, rol_id, activo)
             VALUES (?1, ?2, ?3, ?4, 1)",
            rusqlite::params![SEED_ADMIN_USERNAME, password_hash, "Administrador", admin_rol_id],
        )?;
    }

    Ok(())
}
