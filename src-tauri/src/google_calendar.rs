use crate::auth::DbState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use rand::Rng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tauri::{AppHandle, State};

/// Cliente HTTP con timeout corto: la sincronización con Google es "best effort"
/// y nunca debe dejar una acción de la app esperando mucho tiempo si no hay internet.
fn http_client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .unwrap_or_else(|_| reqwest::blocking::Client::new())
}

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const SCOPE: &str =
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

#[derive(Deserialize)]
pub struct CredencialesGoogleInput {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Serialize)]
pub struct EstadoGoogleCalendar {
    pub configurado: bool,
    pub conectado: bool,
    pub cuenta_email: Option<String>,
    pub client_id: Option<String>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    expires_in: i64,
}

#[derive(Serialize)]
struct EventoCalendar<'a> {
    summary: &'a str,
    description: Option<&'a str>,
    start: EventoFecha,
    end: EventoFecha,
}

#[derive(Serialize)]
struct EventoFecha {
    #[serde(rename = "dateTime")]
    date_time: String,
    #[serde(rename = "timeZone")]
    time_zone: String,
}

fn generar_code_verifier() -> String {
    let bytes: Vec<u8> = (0..64).map(|_| rand::thread_rng().gen()).collect();
    URL_SAFE_NO_PAD.encode(bytes)
}

fn generar_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hasher.finalize())
}

fn leer_credenciales(conn: &Connection) -> Result<Option<(String, String)>, String> {
    conn.query_row(
        "SELECT client_id, client_secret FROM google_calendar_config WHERE id = 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
    .map_err(|e| format!("error consultando credenciales: {e}"))
}

#[tauri::command]
pub fn guardar_credenciales_google(
    state: State<DbState>,
    credenciales: CredencialesGoogleInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "INSERT INTO google_calendar_config (id, client_id, client_secret, access_token, refresh_token, token_expira_en, calendar_id, cuenta_email)
         VALUES (1, ?1, ?2, '', '', '1970-01-01T00:00:00Z', '', '')
         ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, client_secret = excluded.client_secret,
            actualizado_en = datetime('now')",
        params![credenciales.client_id, credenciales.client_secret],
    )
    .map_err(|e| format!("no se pudieron guardar las credenciales: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn obtener_estado_google_calendar(state: State<DbState>) -> Result<EstadoGoogleCalendar, String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    let fila = conn
        .query_row(
            "SELECT client_id, client_secret, cuenta_email FROM google_calendar_config WHERE id = 1",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?)),
        )
        .optional()
        .map_err(|e| format!("error consultando la configuración: {e}"))?;

    let Some((client_id, client_secret, cuenta_email)) = fila else {
        return Ok(EstadoGoogleCalendar {
            configurado: false,
            conectado: false,
            cuenta_email: None,
            client_id: None,
        });
    };

    let configurado = !client_id.trim().is_empty() && !client_secret.trim().is_empty();
    let conectado = !cuenta_email.trim().is_empty();

    Ok(EstadoGoogleCalendar {
        configurado,
        conectado,
        cuenta_email: if conectado { Some(cuenta_email) } else { None },
        client_id: if configurado { Some(client_id) } else { None },
    })
}

#[tauri::command]
pub fn desconectar_google_calendar(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;

    conn.execute(
        "UPDATE google_calendar_config SET access_token = '', refresh_token = '',
            token_expira_en = '1970-01-01T00:00:00Z', calendar_id = '', cuenta_email = ''
         WHERE id = 1",
        [],
    )
    .map_err(|e| format!("no se pudo desconectar la cuenta: {e}"))?;

    Ok(())
}

/// Abre el navegador para autorizar la app, espera el callback en un servidor
/// loopback local y guarda los tokens obtenidos. Bloqueante: se ejecuta en el
/// hilo del comando mientras el usuario completa el login en el navegador.
#[tauri::command]
pub fn conectar_google_calendar(_app: AppHandle, state: State<DbState>) -> Result<String, String> {
    let (client_id, client_secret) = {
        let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
        leer_credenciales(&conn)?
            .ok_or_else(|| "primero debes guardar el Client ID y Client Secret".to_string())?
    };

    let server = tiny_http::Server::http("127.0.0.1:0")
        .map_err(|e| format!("no se pudo iniciar el servidor local de autenticación: {e}"))?;
    let puerto = match server.server_addr() {
        tiny_http::ListenAddr::IP(addr) => addr.port(),
        #[allow(unreachable_patterns)]
        _ => return Err("no se pudo determinar el puerto local".to_string()),
    };
    let redirect_uri = format!("http://127.0.0.1:{puerto}");

    let code_verifier = generar_code_verifier();
    let code_challenge = generar_code_challenge(&code_verifier);

    let auth_url = url::Url::parse_with_params(
        AUTH_URL,
        &[
            ("client_id", client_id.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("response_type", "code"),
            ("scope", SCOPE),
            ("access_type", "offline"),
            ("prompt", "consent"),
            ("code_challenge", code_challenge.as_str()),
            ("code_challenge_method", "S256"),
        ],
    )
    .map_err(|e| format!("no se pudo construir la URL de autorización: {e}"))?;

    tauri_plugin_opener::open_url(auth_url.as_str(), None::<&str>)
        .map_err(|e| format!("no se pudo abrir el navegador: {e}"))?;

    let request = server
        .recv_timeout(Duration::from_secs(180))
        .map_err(|e| format!("error esperando la autorización: {e}"))?
        .ok_or_else(|| "tiempo de espera agotado esperando la autorización en el navegador".to_string())?;

    let url_completa = format!("http://127.0.0.1{}", request.url());
    let parsed = url::Url::parse(&url_completa).map_err(|e| format!("no se pudo leer la respuesta: {e}"))?;
    let code = parsed
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string());
    let error_param = parsed.query_pairs().find(|(k, _)| k == "error").map(|(_, v)| v.to_string());

    let pagina_html = if code.is_some() {
        "<html><body><h2>Autorización completada</h2><p>Ya puedes cerrar esta pestaña y volver a Vitali.</p></body></html>"
    } else {
        "<html><body><h2>Autorización cancelada</h2><p>No se pudo conectar la cuenta de Google.</p></body></html>"
    };
    let response = tiny_http::Response::from_string(pagina_html)
        .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
    request.respond(response).ok();

    if let Some(error) = error_param {
        return Err(format!("Google denegó la autorización: {error}"));
    }
    let code = code.ok_or_else(|| "no se recibió el código de autorización".to_string())?;

    let http = http_client();
    let respuesta = http
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("code_verifier", code_verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .map_err(|e| format!("no se pudo contactar a Google: {e}"))?;

    if !respuesta.status().is_success() {
        let texto = respuesta.text().unwrap_or_default();
        return Err(format!("Google rechazó la autorización: {texto}"));
    }

    let tokens: TokenResponse = respuesta
        .json()
        .map_err(|e| format!("no se pudo leer la respuesta de Google: {e}"))?;
    let refresh_token = tokens
        .refresh_token
        .ok_or_else(|| "Google no devolvió un refresh token; intenta desconectar el acceso de la app en tu cuenta de Google y vuelve a intentarlo".to_string())?;

    let perfil = http
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&tokens.access_token)
        .send()
        .map_err(|e| format!("no se pudo obtener los datos de la cuenta: {e}"))?
        .error_for_status()
        .map_err(|e| format!("no se pudo obtener los datos de la cuenta: {e}"))?
        .json::<serde_json::Value>()
        .map_err(|e| format!("no se pudo leer los datos de la cuenta: {e}"))?;

    let cuenta_email = perfil
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("cuenta de Google conectada")
        .to_string();

    let token_expira_en = (Utc::now() + ChronoDuration::seconds(tokens.expires_in)).to_rfc3339();

    let conn = state.0.lock().map_err(|_| "error interno de base de datos".to_string())?;
    conn.execute(
        "UPDATE google_calendar_config SET access_token = ?1, refresh_token = ?2, token_expira_en = ?3,
            calendar_id = 'primary', cuenta_email = ?4, actualizado_en = datetime('now')
         WHERE id = 1",
        params![tokens.access_token, refresh_token, token_expira_en, cuenta_email],
    )
    .map_err(|e| format!("no se pudo guardar la conexión: {e}"))?;

    Ok(cuenta_email)
}

/// Devuelve un access token vigente, refrescándolo contra Google si ya venció.
fn obtener_access_token_valido(conn: &Connection) -> Result<Option<(String, String, String, String)>, String> {
    let fila = conn
        .query_row(
            "SELECT access_token, refresh_token, token_expira_en, calendar_id, client_id, client_secret
             FROM google_calendar_config WHERE id = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("error consultando la configuración de Google: {e}"))?;

    let Some((access_token, refresh_token, token_expira_en, calendar_id, client_id, client_secret)) = fila else {
        return Ok(None);
    };

    if refresh_token.trim().is_empty() {
        return Ok(None);
    }

    let expira = DateTime::parse_from_rfc3339(&token_expira_en)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now() - ChronoDuration::seconds(1));

    if expira > Utc::now() + ChronoDuration::seconds(30) {
        return Ok(Some((access_token, calendar_id, client_id, client_secret)));
    }

    let http = http_client();
    let respuesta = http
        .post(TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("refresh_token", refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .map_err(|e| format!("no se pudo refrescar el token de Google: {e}"))?;

    if !respuesta.status().is_success() {
        return Err("la conexión con Google Calendar expiró; vuelve a conectar la cuenta".to_string());
    }

    let tokens: TokenResponse = respuesta
        .json()
        .map_err(|e| format!("no se pudo leer el token refrescado: {e}"))?;
    let nueva_expiracion = (Utc::now() + ChronoDuration::seconds(tokens.expires_in)).to_rfc3339();

    conn.execute(
        "UPDATE google_calendar_config SET access_token = ?1, token_expira_en = ?2 WHERE id = 1",
        params![tokens.access_token, nueva_expiracion],
    )
    .map_err(|e| format!("no se pudo actualizar el token: {e}"))?;

    Ok(Some((tokens.access_token, calendar_id, client_id, client_secret)))
}

/// Crea o actualiza el evento de Google Calendar asociado a una cita, y guarda
/// su id en `citas.google_event_id`. No falla la operación si Google no está
/// conectado o si hay un error de red: la cita ya quedó guardada localmente.
pub fn sincronizar_cita(
    conn: &Connection,
    cita_id: i64,
    fecha_hora_inicio: &str,
    notas: Option<&str>,
    paciente_nombre: &str,
) {
    let Ok(Some((access_token, calendar_id, _, _))) = obtener_access_token_valido(conn) else {
        return;
    };

    let inicio = match chrono::NaiveDateTime::parse_from_str(fecha_hora_inicio, "%Y-%m-%dT%H:%M") {
        Ok(dt) => dt,
        Err(_) => return,
    };
    let fin = inicio + ChronoDuration::minutes(50);

    let evento = EventoCalendar {
        summary: &format!("Sesión con {paciente_nombre}"),
        description: notas,
        start: EventoFecha {
            date_time: inicio.format("%Y-%m-%dT%H:%M:%S").to_string(),
            time_zone: "America/Lima".to_string(),
        },
        end: EventoFecha {
            date_time: fin.format("%Y-%m-%dT%H:%M:%S").to_string(),
            time_zone: "America/Lima".to_string(),
        },
    };

    let google_event_id: Option<String> = conn
        .query_row("SELECT google_event_id FROM citas WHERE id = ?1", params![cita_id], |row| row.get(0))
        .ok()
        .flatten();

    let http = http_client();
    let resultado = if let Some(event_id) = google_event_id.filter(|id| !id.trim().is_empty()) {
        http.put(format!(
            "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
        ))
        .bearer_auth(&access_token)
        .json(&evento)
        .send()
    } else {
        http.post(format!(
            "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
        ))
        .bearer_auth(&access_token)
        .json(&evento)
        .send()
    };

    if let Ok(respuesta) = resultado {
        if respuesta.status().is_success() {
            if let Ok(cuerpo) = respuesta.json::<serde_json::Value>() {
                if let Some(id) = cuerpo.get("id").and_then(|v| v.as_str()) {
                    conn.execute(
                        "UPDATE citas SET google_event_id = ?1 WHERE id = ?2",
                        params![id, cita_id],
                    )
                    .ok();
                }
            }
        }
    }
}

/// Elimina el evento de Google Calendar asociado a una cita, si existe.
pub fn eliminar_evento_de_cita(conn: &Connection, cita_id: i64) {
    let Ok(Some((access_token, calendar_id, _, _))) = obtener_access_token_valido(conn) else {
        return;
    };

    let google_event_id: Option<String> = conn
        .query_row("SELECT google_event_id FROM citas WHERE id = ?1", params![cita_id], |row| row.get(0))
        .ok()
        .flatten();

    let Some(event_id) = google_event_id.filter(|id| !id.trim().is_empty()) else {
        return;
    };

    let http = http_client();
    http.delete(format!(
        "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event_id}"
    ))
    .bearer_auth(&access_token)
    .send()
    .ok();
}
