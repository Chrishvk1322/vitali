mod adjuntos;
mod auth;
mod citas;
mod db;
mod entrevistas;
mod google_calendar;
mod grabaciones;
mod pacientes;
mod problemas;
mod propuestas;
mod recursos;
mod sesiones;
mod tests;

use auth::DbState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db(&app.handle().clone())
                .expect("no se pudo inicializar la base de datos");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::login,
            pacientes::crear_paciente,
            pacientes::listar_pacientes,
            pacientes::obtener_paciente,
            pacientes::actualizar_paciente,
            pacientes::eliminar_paciente,
            sesiones::crear_sesion,
            sesiones::listar_sesiones,
            sesiones::actualizar_sesion,
            sesiones::eliminar_sesion,
            citas::crear_cita,
            citas::listar_citas_mes,
            citas::listar_citas_paciente,
            citas::actualizar_cita,
            citas::cancelar_cita,
            citas::eliminar_cita,
            tests::crear_test,
            tests::listar_tests,
            tests::obtener_test,
            tests::actualizar_test,
            tests::eliminar_test,
            tests::registrar_resultado,
            tests::listar_resultados_paciente,
            tests::obtener_resultado,
            tests::eliminar_resultado,
            problemas::crear_problema,
            problemas::listar_problemas,
            problemas::obtener_problema,
            problemas::actualizar_problema,
            problemas::eliminar_problema,
            problemas::obtener_nota_sesion_consulta,
            problemas::guardar_nota_sesion_consulta,
            entrevistas::obtener_entrevista,
            entrevistas::guardar_entrevista,
            propuestas::obtener_propuesta,
            propuestas::guardar_propuesta,
            adjuntos::listar_adjuntos_sesion,
            adjuntos::agregar_adjunto_sesion,
            adjuntos::obtener_ruta_adjunto,
            adjuntos::eliminar_adjunto,
            recursos::listar_recursos,
            recursos::agregar_recurso,
            recursos::obtener_ruta_recurso,
            recursos::eliminar_recurso,
            google_calendar::guardar_credenciales_google,
            google_calendar::obtener_estado_google_calendar,
            google_calendar::conectar_google_calendar,
            google_calendar::desconectar_google_calendar,
            grabaciones::listar_grabaciones,
            grabaciones::crear_grabacion,
            grabaciones::renombrar_grabacion,
            grabaciones::obtener_ruta_grabacion,
            grabaciones::eliminar_grabacion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
