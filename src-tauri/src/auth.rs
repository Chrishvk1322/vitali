use rusqlite::OptionalExtension;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

pub struct DbState(pub Mutex<rusqlite::Connection>);

#[derive(Serialize)]
pub struct UsuarioSesion {
    pub id: i64,
    pub username: String,
    pub nombres: String,
    pub rol: String,
}

#[tauri::command]
pub fn login(
    state: State<DbState>,
    username: String,
    password: String,
) -> Result<UsuarioSesion, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let row = conn
        .query_row(
            "SELECT u.id, u.username, u.nombres, u.password_hash, r.nombre
             FROM usuarios u
             JOIN roles r ON r.id = u.rol_id
             WHERE u.username = ?1 AND u.activo = 1",
            [&username],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                ))
            },
        )
        .optional()
        .map_err(|_| "error consultando el usuario".to_string())?;

    let (id, username, nombres, password_hash, rol) =
        row.ok_or_else(|| "usuario o contraseña incorrectos".to_string())?;

    let valida = bcrypt::verify(&password, &password_hash)
        .map_err(|_| "error verificando la contraseña".to_string())?;

    if !valida {
        return Err("usuario o contraseña incorrectos".to_string());
    }

    Ok(UsuarioSesion {
        id,
        username,
        nombres,
        rol,
    })
}
