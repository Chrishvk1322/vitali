# Bitácora de Implementación — Sistema de Gestión de Historias Clínicas

> Este archivo es la única fuente de verdad del proyecto: refleja el estado real del código, no solo la intención. Antes vivía junto a `estructura.md` (la especificación original); se unificaron en este documento el 2026-10-03 porque `estructura.md` había quedado desactualizado (su modelo de datos y su Fase 5 ya no coincidían con lo implementado) y duplicaba el stack, la paleta y el plan de fases que ya se documentan aquí.

## Encargo original (resumen)

Sistema de Gestión de Historias Clínicas para un consultorio psicológico, encargado como una especificación de 5 fases con este stack y paleta — ambos se mantuvieron sin cambios a lo largo del proyecto (ver "Decisiones técnicas confirmadas" debajo):

- **Stack:** Tauri v2 (núcleo Rust) + Angular 21 (Signals, control flow nuevo, Reactive Forms) + Tailwind CSS v4 + SQLite embebido vía un único archivo `.db` local.
- **Paleta original:** `#A2C09A` (verde salvia, primario/calma), `#6174B6` (azul pizarra/índigo, secundario/acción), `#F8FAF9` (fondo), `#2C3437` (texto), `#E2E8F0` (bordes). Son los valores base de los tokens `--color-clinico-*` en `src/styles.css`.
- **Plan original de 5 fases:** (1) configuración + autenticación, (2) módulo de pacientes, (3) detalle del paciente y sesiones, (4) calendario/agenda, (5) placeholders de navegación para Tests y Plantillas. Las cinco se completaron y están detalladas fase por fase en el checklist de abajo; todo lo construido después (análisis funcional, entrevista, propuesta, recursos, Google Calendar, grabaciones, etc.) fue a pedido explícito del usuario, fuera del spec original.
- El modelo de datos y el mapa de navegación originales quedaron ampliamente superados por la implementación real; para el esquema y las pantallas actuales, ver el código y las secciones fechadas de este documento en vez de un documento de spec separado.

## Decisiones técnicas confirmadas

- **Gestor de paquetes:** `pnpm`.
- **Usuario inicial sembrado:** `admin` / `admin123` (rol `admin`), creado por `src-tauri/src/db.rs` solo si la tabla `usuarios` está vacía. Cambiar la contraseña desde la app cuando exista esa función.
- **UI:** Tailwind CSS v4 puro, sin librería de componentes (ni Angular Material ni PrimeNG). Paleta definida como tokens `@theme` en `src/styles.css` (`clinico-primario`, `clinico-secundario`, `clinico-fondo`, `clinico-texto`, `clinico-borde`), usables como `bg-clinico-primario`, `text-clinico-texto`, etc.
- **Persistencia:** SQLite vía `rusqlite` (feature `bundled`, no requiere sqlite del sistema). Archivo de datos en el directorio de datos de la app (`app_data_dir()/clinica.db`), gestionado por Tauri — no se versiona.
- **Auth:** contraseñas con `bcrypt`. Sesión persistida en `sessionStorage` del lado Angular (`AuthService`), guard de rutas en `src/app/core/auth.guard.ts`.
- **Angular:** se actualizó la plantilla generada (venía en v20) a **Angular 21.2.22** (LTS), editando `package.json` a mano antes de `pnpm install`.

## Comandos para levantar el entorno

```
pnpm install
pnpm tauri dev
```

Requiere Rust (`cargo`/`rustc`) instalado y en el `PATH`, y en Windows las Build Tools de Visual Studio con el workload "Desktop development with C++". Ambos ya están instalados en esta máquina (verificado 2026-08-30).

## Checklist por fases

### Fase 1 — Configuración del proyecto y autenticación ✅ COMPLETADA (2026-08-30)
- [x] Scaffold Tauri v2 + Angular 21 + Tailwind v4 (`create-tauri-app`, luego bump manual de Angular 20→21).
- [x] Paleta de colores personalizada en `src/styles.css` (`@theme` de Tailwind v4).
- [x] Backend Rust: `src-tauri/src/db.rs` (migraciones `roles`/`usuarios` + seed), `src-tauri/src/auth.rs` (comando `login` con bcrypt).
- [x] Frontend: `LoginComponent` (formulario reactivo), `AuthService` + `authGuard`, `HubComponent` con las 4 tarjetas maestras.
- [x] Rutas placeholder para `/pacientes`, `/agenda`, `/tests`, `/plantillas` (redirigen a componentes vacíos hasta sus fases).
- [x] Verificado: `ng build` sin errores, `cargo build` sin errores, `pnpm tauri dev` levanta la ventana nativa correctamente (proceso `tauri-app.exe` corriendo).
- [x] Verificación manual por el usuario: login con `admin` / `admin123` confirmado funcionando (2026-08-30).

### Fase 2 — Módulo de Pacientes (registro y listado) ✅ COMPLETADA (2026-08-30, pendiente de confirmación visual del usuario)
- [x] Migración SQLite tabla `pacientes` (en `db.rs`).
- [x] Vista intermedia `/pacientes` con botones "+ Nuevo Paciente" / "📋 Listado de Pacientes" (`pacientes-entry.component`).
- [x] Formulario reactivo "Nuevo Paciente" (`nuevo-paciente.component`) con todos los campos del spec, obligatorios: `apellidos_nombres`, `fecha_nacimiento`, `fecha_consulta`.
- [x] Comandos Rust `crear_paciente` / `listar_pacientes` en `src-tauri/src/pacientes.rs`, registrados en `invoke_handler` de `lib.rs`.
- [x] Listado (`listado-pacientes.component`) con buscador reactivo por nombre (Signals + `ngModel`).
- [x] Verificado: `ng build` y `cargo build` sin errores, `pnpm tauri dev` levanta la app.
- [x] Verificación manual por el usuario: alta y listado/búsqueda de pacientes confirmados funcionando (2026-08-30).
- Nota: el clic en una fila del listado aún NO navega al detalle del paciente — esa navegación se implementa en la Fase 3 junto con la vista de ficha técnica.

### Fase 3 — Detalle del paciente y sistema de sesiones ✅ COMPLETADA (2026-08-30, pendiente de confirmación visual del usuario)
- [x] Migración SQLite tablas `sesiones_seguimiento` y `citas` (esta última se adelantó desde Fase 4 porque el modal "Agendar Siguiente Cita" la necesita).
- [x] Comando Rust `obtener_paciente` (`pacientes.rs`), `crear_sesion`/`listar_sesiones` (`sesiones.rs`), `crear_cita` (`citas.rs`).
- [x] Vista de ficha técnica completa del paciente (`detalle-paciente.component`, ruta `/pacientes/:id`).
- [x] Listado cronológico inverso de sesiones (`ORDER BY fecha_hora DESC` en `listar_sesiones`).
- [x] Modal "Agregar Observación / Nueva Sesión" y modal "Agendar Siguiente Cita", ambos con Guardar/Confirmar y Cancelar.
- [x] Filas del listado de pacientes ahora navegan al detalle (`routerLink="['/pacientes', paciente.id]"`).
- [x] Verificado: `ng build` y `cargo build` sin errores, `pnpm tauri dev` levanta la app.
- [x] Verificación manual por el usuario: detalle del paciente, nueva sesión y agendar cita confirmados funcionando (2026-08-30).
- Nota importante para Fase 4: la tabla `citas` y el comando `crear_cita` ya existen; solo falta construir la UI de calendario (vista mensual/semanal, detalle de día, cancelar cita) y un comando `listar_citas` que aún no existe.

### Fase 4 — Calendario y sincronización de agenda ✅ COMPLETADA (2026-08-30, pendiente de confirmación visual del usuario)
- [x] Tabla `citas` ya existía desde la Fase 3.
- [x] Comandos Rust `listar_citas_mes(anio_mes)` y `cancelar_cita(id)` en `citas.rs` (join con `pacientes` para traer el nombre).
- [x] Componente de calendario mensual (`agenda.component`) construido a mano con Tailwind: grilla 6x7, navegación mes anterior/siguiente, días con citas resaltados con `bg-clinico-secundario` y un punto `bg-clinico-primario`.
- [x] Panel de detalle del día seleccionado: tarjetas de cita (horario, nombre del paciente, estado), clic en el paciente navega a `/pacientes/:id`, botón "Cancelar" solo visible si `estado === 'Programada'`.
- [x] Modal "Nueva cita" con buscador de pacientes (reutiliza `listar_pacientes`), selección de paciente, fecha/hora de inicio y fin, notas.
- [x] Verificado: `ng build` y `cargo build` sin errores, `pnpm tauri dev` levanta la app.
- [x] Verificación manual por el usuario: crear cita, resaltado del día, detalle del día, navegación al paciente y cancelación confirmados funcionando (2026-08-30).

### Fase 5 — Preparación de módulos Tests y Plantillas ✅ COMPLETADA (2026-08-30)
- [x] Ya cubierta desde la Fase 1: rutas `/tests` y `/plantillas` (con guard de autenticación) enlazadas desde las tarjetas del Hub Principal, cada una con su componente placeholder (`src/app/features/tests/tests.component.ts`, `src/app/features/plantillas/plantillas.component.ts`).
- [x] El spec de Fase 5 solo pedía "estructuras base y placeholders de navegación para su posterior implementación funcional" — no hay requerimientos concretos de evaluación psicométrica ni de generación de reportes todavía, así que no hay más por construir en esta fase.
- Nota: el placeholder de Tests fue reemplazado por una implementación real en la sección "Módulo de Tests" más abajo (2026-09-05). El de Plantillas (generación de reportes) sigue pendiente — cuando existan requerimientos concretos, reemplazar `plantillas.component.ts`; no se creó ningún comando Rust para ese módulo.

### Pulido visual (post-spec) ✅ COMPLETADO (2026-08-30, pendiente de confirmación visual del usuario)
El usuario pidió mejorar el diseño visual tras completar las 5 fases. Aportó `logo_vitali.jpg` (raíz del proyecto): lotus/hoja verde salvia + wordmark serif "VITALI" en índigo, que confirma la paleta y agrega dirección tipográfica.
- [x] Ventana Tauri (`src-tauri/tauri.conf.json`): título "Vitali · Centro Psicológico", `productName: "Vitali"`, abre **maximizada** (`maximized: true`), tamaño base 1280x800, mínimo 1024x700.
- [x] Logo copiado a `src/assets/logo-vitali.jpg`, usado en Login (grande) y en el header del Hub (pequeño, circular).
- [x] Tipografía serif "Playfair Display" (pesos 600/700) **auto-hospedada** en `src/assets/fonts/*.woff2` (no CDN — la app debe funcionar offline en una clínica). Declarada vía `@font-face` + token `--font-display` en `src/styles.css`, expone la utilidad Tailwind `font-display`.
- [x] Clases reutilizables en `src/styles.css` (`@layer components`): `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.field`, `.field-label`, `.card`. Reemplazan las clases largas repetidas en cada formulario/botón.
- [x] Componentes compartidos nuevos: `src/app/shared/page-header.component.ts` (header "← Volver" + título + wordmark, usado en pacientes-entry, nuevo-paciente, listado-pacientes, detalle-paciente, agenda) y `src/app/shared/icon.component.ts` (SVGs inline hechos a mano, sin librería externa; reemplaza los emojis).
- [x] Colores de marca con más presencia (mismos tonos, sin saturar): bordes de acento `border-l-4` en tarjetas, fondos de icono `bg-clinico-*/10-15`, badges de estado de cita coloreados (`claseBadgeEstado()` en `agenda.component.ts`).
- [x] Layout más ancho ahora que la ventana es más grande: Hub a 4 columnas (`max-w-6xl`), formularios/listados a `max-w-4xl/5xl`, Agenda con layout de dos columnas (calendario | detalle del día, con `lg:sticky`).
- [x] Micro-animaciones: `animate-fade-in`/`animate-scale-in` (keyframes en `styles.css`, vía tokens `--animate-*` de Tailwind v4) aplicadas a los modales; `transition-all` + `hover:-translate-y-0.5` en tarjetas.
- [x] Verificado: `ng build` y `cargo build` sin errores (advertencia de `RouterLink` no usado en `detalle-paciente.component.ts` ya corregida), `pnpm tauri dev` levanta la app.
- [ ] **Pendiente de verificación manual por el usuario:** confirmar que la ventana abre maximizada, que el logo se ve bien en Login/Hub, y revisar el look general de todas las pantallas (colores, botones, iconos, animaciones de modal).
- Nota técnica: en `[ngClass]`/clases dinámicas evitar `[class.nombre/con-slash]` o `[class.hover:algo]` como binding de Angular — es frágil. Usar `[ngClass]="objeto"` o un método que devuelva un string de clases (patrón usado en `claseDia()` y `claseBadgeEstado()` de `agenda.component.ts`).

### Ajustes de UX post-pulido visual ✅ COMPLETADO (2026-09-03, confirmado por el usuario)
- [x] Login más grande (`max-w-lg`, logo `w-48 h-48`, card `p-10`, campos/botón `text-base py-3`).
- [x] Botón "Volver" de `PageHeaderComponent` rediseñado como píldora con borde e icono (antes solo era una flecha).
- [x] Eliminada la pantalla intermedia `/pacientes` (`pacientes-entry.component`, borrado): el Hub ahora tiene tarjetas directas "Nuevo Paciente" y "Listado de Pacientes" (5 tarjetas en `lg:grid-cols-3`).
- [x] Listado de pacientes rediseñado: avatar circular con inicial, nombre en `font-display` destacado, teléfono con ícono `phone`, fecha con ícono `calendar-days`.
- [x] Campo `tareas` agregado a `sesiones_seguimiento` (migración aditiva en `db.rs` vía `agregar_columna_si_falta`), mostrado como lista de viñetas en cada sesión del detalle del paciente; textarea "Tareas (una por línea)" en el modal de nueva sesión.
- [x] Verificado: `ng build`/`cargo build` sin errores, confirmado visualmente por el usuario ("me parece bien").

### Edición y eliminación de pacientes ✅ COMPLETADO (2026-09-03, pendiente de confirmación visual del usuario)
El usuario pidió reordenar la ficha técnica del paciente (domicilio y acompañante más grandes/destacados) y agregar edición y eliminación de pacientes, esta última con una alerta clara de pérdida irreversible de datos.
- [x] Backend: comandos `actualizar_paciente` (UPDATE completo por `id`) y `eliminar_paciente` (transacción que borra `citas` y `sesiones_seguimiento` del paciente antes de borrar el registro, ya que no hay `ON DELETE CASCADE` en el esquema) en `src-tauri/src/pacientes.rs`, registrados en `lib.rs`.
- [x] Frontend: `PacientesService.actualizarPaciente()` / `eliminarPaciente()`.
- [x] Ruta nueva `pacientes/:id/editar` reutilizando `NuevoPacienteComponent`, que ahora detecta modo edición por `route.snapshot.paramMap`, precarga el formulario con `obtenerPaciente()` y cambia título/destino de guardado/cancelar según el modo.
- [x] `PageHeaderComponent` ahora acepta contenido proyectado con `<ng-content select="[actions]" />` junto al wordmark, usado en el detalle del paciente para los botones "Editar" y "Eliminar".
- [x] Ficha técnica del detalle reordenada: campos cortos en grid de 3 columnas; "Domicilio" y "Acompañante" ahora en recuadros destacados de ancho completo con texto más grande (`text-base font-medium`), debajo del grid.
- [x] Modal de confirmación de eliminación (borde superior rojo, ícono `alert-triangle`, texto explícito de que la eliminación es irreversible y borra sesiones/citas asociadas) antes de invocar `eliminar_paciente`; tras eliminar redirige a `/pacientes/listado`.
- [x] Nuevos íconos en `icon.component.ts`: `edit`, `trash`, `alert-triangle`.
- [x] Verificado: `ng build` y `cargo build` sin errores.
- [ ] **Pendiente de verificación manual por el usuario:** probar editar un paciente existente, y probar eliminar un paciente (idealmente uno de prueba) confirmando que el modal de advertencia se ve claro y que la eliminación funciona correctamente.

### Ajustes tras primera revisión de edición/eliminación ✅ COMPLETADO (2026-09-03, pendiente de confirmación visual del usuario)
- [x] Revertido el estilo "destacado en recuadro" de Domicilio/Acompañante (quedaba demasiado prominente); ahora vuelven al mismo estilo `dt/dd` del resto de la ficha técnica, pero ocupan la fila completa (`sm:col-span-2 lg:col-span-3`) para que direcciones o nombres largos no se corten.
- [x] Botón "+ Nueva sesión" renombrado a "+ Registrar sesión".
- [x] El modal de registro de sesión ya no pide fecha y hora manualmente: se eliminó el campo `fecha_hora` del formulario reactivo y se genera automáticamente con la fecha/hora local del dispositivo en el momento de guardar (`fechaHoraActual()` en `detalle-paciente.component.ts`), con una nota informativa en el modal.
- [x] Verificado: `ng build` sin errores.
- [ ] **Pendiente de verificación manual por el usuario.**

### Citas: selección de fecha/hora simplificada + card en detalle de paciente ✅ COMPLETADO (2026-09-03, pendiente de confirmación visual del usuario)
- [x] Backend: nuevo comando `listar_citas_paciente(paciente_id)` en `src-tauri/src/citas.rs` (reutiliza `CitaConPaciente`), registrado en `lib.rs`. `AgendaService.listarCitasPaciente()` en el frontend.
- [x] Modal "Agendar Siguiente Cita" (detalle de paciente) y "Nueva cita" (agenda): reemplazado el único input `datetime-local` (fecha+hora de inicio, y el campo separado de fecha/hora de fin que ya no se pedía en la UI) por dos inputs simples lado a lado — `type="date"` y `type="time"` — más intuitivos que el widget combinado del navegador. Se combinan en `${fecha}T${hora}` al guardar. Se conserva el campo "Notas". En la agenda se conserva el buscador de paciente sin cambios.
- [x] `fecha_hora_fin` de `CitaInput` ya no se recolecta desde la UI (se envía `null`); el campo sigue existiendo en la base de datos/backend por si se retoma a futuro.
- [x] Nueva card "Citas" en el detalle del paciente (debajo de "Sesiones"): lista las citas del paciente con fecha, hora, notas y badge de estado (mismo estilo que la agenda), con botón "Cancelar cita" para las que están "Programada"; si no hay ninguna, muestra "No tiene citas pendientes."
- [x] Verificado: `ng build` y `cargo build` sin errores.
- [ ] **Pendiente de verificación manual por el usuario.**

### Edición/eliminación de sesiones y reprogramación de citas ✅ COMPLETADO (2026-09-03, pendiente de confirmación visual del usuario)
- [x] Backend: `actualizar_sesion(id, {resumen_tratado, observaciones, tareas})` (no toca `fecha_hora`) y `eliminar_sesion(id)` en `src-tauri/src/sesiones.rs`; `actualizar_cita(id, {fecha_hora_inicio, notas})` (no toca `estado`) en `src-tauri/src/citas.rs`. Todos registrados en `lib.rs`.
- [x] Frontend: `PacientesService.actualizarSesion()`/`eliminarSesion()`, `AgendaService.actualizarCita()`.
- [x] Botón "Agendar Siguiente Cita" movido de la sección "Sesiones" a la card "Citas" (junto al título, mismo patrón que "+ Nueva cita" de la agenda).
- [x] Cada cita con estado "Programada" ahora tiene botones "Reprogramar" (abre el mismo modal precargado con fecha/hora/notas, sin tocar el estado) y "Cancelar cita" (como antes).
- [x] Cada sesión tiene íconos de editar/eliminar; editar precarga resumen/observaciones/tareas en el mismo modal sin exponer ni modificar la fecha de registro original; eliminar pide confirmación en un modal dedicado (mismo patrón visual que "Eliminar paciente") antes de invocar `eliminar_sesion`.
- [x] `DetallePacienteComponent`: nuevos signals `sesionEditId`/`citaEditId` (null = modo creación) y `modalEliminarSesionAbierto`/`sesionAEliminar`/`eliminandoSesion`/`errorEliminarSesion`; `abrirModalSesion()`/`abrirModalCita()` ahora aceptan un registro opcional para precargar el formulario en modo edición.
- [x] Verificado: `ng build` y `cargo build` sin errores.
- [ ] **Pendiente de verificación manual por el usuario.**

### Módulo de Tests (evaluaciones psicométricas) ✅ COMPLETADO (2026-09-05, pendiente de confirmación visual del usuario)
El usuario pidió un CRUD real de tests psicométricos: preguntas respondidas en escala de 5 niveles ('nunca'=0, 'rara vez'=1, 'a veces'=2, 'frecuentemente'=3, 'siempre'=4), con un posible diagnóstico calculado según el puntaje total, y un botón "Evaluar" en el detalle del paciente.

Decisiones confirmadas por el usuario antes de implementar: (1) el diagnóstico se define con **rangos numéricos por test** (mín-máx → etiqueta), configurables al crear/editar el test; (2) el módulo "Tests" del hub es el **administrador de plantillas** (ya no placeholder); (3) el formulario de evaluación se llena en una **página completa dedicada**, no en un modal.

- [x] Backend: nuevas tablas en `db.rs` — `tests`, `test_preguntas`, `test_rangos`, `test_resultados` (guarda `test_nombre` copiado), `test_resultado_respuestas` (guarda `pregunta_texto` copiado) — la copia de nombre/texto evita que un resultado histórico quede huérfano si el test origen se edita o elimina después (no hay `ON DELETE CASCADE` en el esquema, igual que el resto de tablas).
- [x] Nuevo módulo `src-tauri/src/tests.rs` con comandos `crear_test`/`listar_tests`/`obtener_test`/`actualizar_test`/`eliminar_test` (CRUD de plantillas, con transacciones para reemplazar preguntas/rangos completos en cada `actualizar_test`) y `registrar_resultado`/`listar_resultados_paciente`/`obtener_resultado`/`eliminar_resultado` (evaluaciones). `registrar_resultado` suma las respuestas y busca en qué rango (`puntaje_min <= total <= puntaje_max`) cae para asignar el `diagnostico`; todos registrados en `lib.rs`. `eliminar_paciente` ahora también borra en cascada `test_resultados`/`test_resultado_respuestas` del paciente.
- [x] Frontend: `TestsService` (`src/app/features/tests/tests.service.ts`) con los DTOs e invocaciones correspondientes.
- [x] `TestsComponent` (antes placeholder) ahora es el listado real de tests con editar/eliminar (modal de confirmación, mismo patrón que "Eliminar paciente"). `NuevoTestComponent` (`/tests/nuevo`, `/tests/:id/editar`) con `FormArray` dinámico de preguntas y de rangos de diagnóstico.
- [x] Flujo de evaluación desde el paciente: botón "Evaluar" dentro de la nueva card "Evaluaciones" del detalle del paciente → `SeleccionarTestComponent` (`/pacientes/:id/evaluar`, lista tests disponibles) → `RealizarTestComponent` (`/pacientes/:id/evaluar/:testId`, una pregunta por fila con 5 opciones tipo radio estilizadas) → al guardar muestra puntaje total + diagnóstico en la misma página y el resultado queda listado en la card "Evaluaciones" (con botón eliminar y su propio modal de confirmación).
- [x] Rutas nuevas en `app.routes.ts`: `tests/nuevo`, `tests/:id/editar`, `pacientes/:id/evaluar`, `pacientes/:id/evaluar/:testId` (declaradas antes de `pacientes/:id`, mismo criterio que `pacientes/:id/editar`).
- [x] Verificado: `ng build --configuration development` y `cargo build` sin errores; `pnpm tauri dev` levanta la app sin errores de compilación (confirmado en el log de arranque).
- [ ] **Pendiente de verificación manual por el usuario:** crear un test de ejemplo con preguntas y rangos, editarlo, evaluar a un paciente y confirmar que el puntaje/diagnóstico calculado es correcto y se ve bien en la card "Evaluaciones"; probar eliminar un resultado y eliminar un test.

### Citas: fecha editable en sesiones + lógica de estados avanzada ✅ COMPLETADO (2026-09-08/10)
- [x] Sesiones: el registro y la edición ahora piden **solo fecha** (sin hora) mediante un `<input type="date">`; al editar se precarga con la fecha ya guardada y, si no se cambia, se reenvía igual. Backend: `SesionActualizarInput` ahora incluye `fecha_hora` y `actualizar_sesion` la persiste (antes solo actualizaba el contenido).
- [x] Nuevo comando `eliminar_cita(id)` (borrado definitivo, distinto de `cancelar_cita` que solo cambia `estado`). Botón "Eliminar" agregado tanto en la card "Citas" del detalle de paciente como en la vista de Agenda, con su propio modal de confirmación.
- [x] Lógica de estados de una cita unificada en ambas vistas (detalle de paciente y Agenda): con estado **Programada** solo se muestra "Cancelar cita"; con estado **Cancelada** se muestran "Reprogramar" y "Eliminar". `actualizar_cita` ahora también vuelve a poner `estado = 'Programada'` al reprogramar una cita cancelada, para que quede consistente con el flujo.
- [x] Agenda: el modal "Nueva cita" ahora también sirve para reprogramar (parámetro opcional `cita`), con el campo de paciente bloqueado en modo edición.
- [x] Botones de acciones de cita (Reprogramar/Cancelar/Eliminar) con estilo visual unificado (mismo tamaño/forma, solo cambia el color).
- [x] Verificado y confirmado visualmente por el usuario.

### "Sesión de consulta": Análisis funcional, Entrevista y Propuesta de intervención terapéutica ✅ COMPLETADO (2026-09-12)
Nuevo flujo clínico completo basado en tres PDFs de referencia aportados por el usuario en `recurso/` (`consulta.pdf`, `entrevista.pdf`, `propuesta.pdf`).
- [x] Nueva card "Sesión de consulta" en el detalle del paciente → pantalla con 3 secciones (`listado-problemas.component`, ruta `/pacientes/:id/analisis-funcional`): **Análisis funcional** (listado de "problemas" del paciente + botón "Agregar problema"), **Entrevista** (card que navega a un formulario aparte) y **Propuesta de intervención terapéutica** (card que navega a otro formulario aparte). Cada sección tiene un ícono destacado en círculo.
- [x] **Análisis funcional por problema** (`problema-detalle.component`, ruta `/pacientes/:id/analisis-funcional/:problemaId`): nombre del problema de solo lectura con botón de edición explícito; tabla "Análisis funcional" (Antecedentes/Conducta problema/Consecuencia × Situacionales/Fisiológicos/Cognitivos/Motoras/Medición) y tabla "Diagnóstico funcional" (Exceso/Debilitamiento/Déficit), replicando `consulta.pdf`. Formulario a 80% del ancho de pantalla, campos de texto grandes. Botón "Eliminar" en el header con modal de confirmación. Backend: tabla `analisis_funcional_problemas`, módulo `problemas.rs` (CRUD completo).
- [x] **Entrevista** (`entrevista.component`, ruta `/pacientes/:id/entrevista`): formulario de una sola página con las preguntas de `entrevista.pdf` agrupadas en 6 secciones (a. Delimitación... hasta f. Expectativas y objetivos), cada pregunta con su propio campo de texto; permite reingresar y editar respuestas en cualquier momento. "Guardar Cambios" regresa a "Sesión de consulta". Backend: tabla `entrevista_respuestas` (clave `paciente_id` + `pregunta_codigo`), comandos `obtener_entrevista`/`guardar_entrevista` (upsert por pregunta).
- [x] **Propuesta de intervención terapéutica** (`propuesta.component`, ruta `/pacientes/:id/propuesta`): objetivo general, objetivos específicos (lista dinámica), modalidad/frecuencia/duración, y **Plan de trabajo terapéutico** con fases y sesiones dinámicas — "Agregar fase" y, dentro de cada fase, "Agregar sesión" cuantas veces se necesite; el número de sesión se autocalcula y continúa la numeración entre fases (si la Fase 1 termina en la sesión 4, la Fase 2 arranca en la 5). Backend: tablas `propuestas`, `propuesta_objetivos_especificos`, `propuesta_fases`, `propuesta_sesiones`; comandos `obtener_propuesta`/`guardar_propuesta` (reemplaza fases/sesiones/objetivos completos en cada guardado, mismo patrón que `tests::actualizar_test`).
- [x] Verificado y confirmado visualmente por el usuario en varias iteraciones (numeración de preguntas de la entrevista corregida, tamaño de fuente, redirección al guardar).

### Adjuntos en sesiones (PDF/imágenes) con visor inline ✅ COMPLETADO (2026-09-12)
- [x] Cada sesión del detalle de paciente permite **adjuntar archivos** (botón "Adjuntar archivo", selector nativo vía `tauri-plugin-dialog`), listados como chips con nombre/tamaño, con botón de eliminar.
- [x] Restringido a **PDF e imágenes** (jpg/jpeg/png, máx. 20 MB) — Word se descartó porque no hay forma nativa de previsualizarlo en el WebView.
- [x] Visor inline dentro de la propia app (no abre programa externo): imágenes con `<img>`, PDF con `<iframe>`, usando el **asset protocol** de Tauri (`convertFileSrc` + scope en `tauri.conf.json`) en vez de rutas `file://` directas. Requiere la feature `protocol-asset` en la dependencia `tauri` del `Cargo.toml`.
- [x] Backend: tabla `sesion_adjuntos`, módulo `adjuntos.rs` (`listar_adjuntos_sesion`/`agregar_adjunto_sesion`/`obtener_ruta_adjunto`/`eliminar_adjunto`); los archivos se copian a `app_data_dir()/adjuntos/sesion_<id>/`, nunca se guardan como BLOB. Al **eliminar una sesión** ahora también se eliminan en cascada sus adjuntos (archivo físico + registro), evitando huérfanos (`eliminar_adjuntos_de_sesion`, llamada desde `sesiones::eliminar_sesion`).
- [x] Verificado y confirmado por el usuario.

### Módulo "Recursos" en el dashboard ✅ COMPLETADO (2026-09-18)
- [x] Nueva card "Recursos" en el Hub → biblioteca de archivos **PDF** de apoyo (`recursos.component`, ruta `/recursos`): botón "Agregar recurso" (mismo selector de archivo que adjuntos, restringido a `.pdf`, máx. 20 MB), buscador por nombre, **paginación de 10 por página** (numeración + flechas), y el mismo visor inline en `<iframe>` vía asset protocol. Botón eliminar por recurso con confirmación.
- [x] Backend: tabla `recursos`, módulo `recursos.rs` (mismo patrón de almacenamiento en disco que `adjuntos.rs`, carpeta `app_data_dir()/recursos/`). Scope del asset protocol ampliado para incluir esta carpeta.
- [x] Verificado; pendiente de confirmación visual final del usuario tras el último ajuste de la card "Evaluación Psicométrica" (ver abajo).

### Card "Evaluación Psicométrica" en el detalle del paciente ✅ COMPLETADO (2026-09-18)
- [x] Nueva card justo después de "Sesión de consulta" en el detalle del paciente. Se probó primero enlazándola al flujo de Tests existente (`/pacientes/:id/evaluar`), pero a pedido del usuario quedó **solo visual** ("Próximamente.") — el enlace y la funcionalidad real se retomarán más adelante cuando se definan los requerimientos de esa sección.

### Integración con Google Calendar (push unidireccional) ✅ COMPLETADO (2026-09-19)
El usuario pidió que las citas se reflejen en Google Calendar para que el cliente reciba notificaciones sin depender de que Vitali esté abierto. Se evaluaron alternativas (sync bidireccional, tarea programada local) y se optó por **push unidireccional**: Vitali crea/actualiza/borra eventos en Google Calendar, nunca lee cambios desde allí.
- [x] Documento nuevo `GOOGLE_CALENDAR_SETUP.md` en la raíz: pasos completos para crear el proyecto en Google Cloud Console (habilitar Calendar API, configurar pantalla de consentimiento externo con scope `calendar.events` + `userinfo.email`, agregar test users, crear credenciales OAuth tipo "App de escritorio", y recomendación de pasar a "En producción" para que el token no expire cada 7 días). Cada cliente/clínica necesita su **propio** proyecto de Google Cloud (no uno compartido).
- [x] Panel de configuración dentro del módulo **Agenda** (botón "Google Calendar" con ícono de engranaje, nuevo ícono `settings` en `icon.component.ts`): permite guardar Client ID/Secret, conectar la cuenta (abre el navegador para el login OAuth) y desconectarla; muestra el email de la cuenta conectada.
- [x] Backend (`google_calendar.rs`, nuevas dependencias `reqwest`, `tiny_http`, `rand`, `sha2`, `base64`, `url` en `Cargo.toml`): flujo OAuth2 con **PKCE** y un servidor **loopback local** (`tiny_http`, puerto aleatorio) para capturar el código de autorización sin necesitar un servidor propio expuesto a internet; refresco automático de `access_token` contra `refresh_token` cuando expira; todas las llamadas HTTP usan un cliente con **timeout de 8s** para que un problema de red nunca deje una acción de la app esperando indefinidamente.
- [x] Tabla `google_calendar_config` (fila única `id=1`) guarda `client_id`/`client_secret` (configurables desde la UI, no hardcodeados — así el mismo código sirve para cualquier cliente) y los tokens/estado de la cuenta conectada. Columna `google_event_id` agregada a `citas`.
- [x] Sincronización conectada a las operaciones existentes de citas (`citas.rs`): `crear_cita`/`actualizar_cita` crean o actualizan el evento en Google; `cancelar_cita`/`eliminar_cita` borran el evento. Todo es **best-effort**: si Google Calendar no está conectado o falla la red, la cita igual se guarda localmente sin ningún error visible para el usuario.
- [x] Bug corregido durante la prueba: la llamada inicial a `GET /calendars/primary` (para obtener el email de la cuenta) daba 403 porque el scope `calendar.events` no incluye permiso de lectura de metadatos del calendario — se reemplazó por `GET /oauth2/v2/userinfo` agregando el scope `userinfo.email`.
- [ ] **Pendiente de verificación manual por el usuario:** confirmar que la reconexión con el scope corregido funciona y que las citas aparecen en Google Calendar (se compartieron credenciales de prueba del proyecto de Google Cloud del usuario).

### Módulo "Grabación" (audio de sesiones) ✅ COMPLETADO (2026-09-19)
- [x] Nueva card "Grabación" al final del detalle del paciente → listado de grabaciones (`listado-grabaciones.component`, ruta `/pacientes/:id/grabaciones`).
- [x] Grabación de audio hecha 100% con APIs del navegador (`getUserMedia` + `MediaRecorder`, formato `audio/webm;codecs=opus`) — no se agregó ninguna librería de audio en Rust. Modal "Nueva grabación": primero se pide el nombre, luego "Iniciar grabación" (con timer en vivo) y "Detener y guardar".
- [x] El audio grabado se envía al backend como **base64** (vía `invoke`, sin plugin de filesystem adicional) para mantener el mismo patrón que el resto de la app: el backend es quien posee el almacenamiento en disco. Backend: tabla `grabaciones`, módulo `grabaciones.rs` (`listar_grabaciones`/`crear_grabacion`/`renombrar_grabacion`/`obtener_ruta_grabacion`/`eliminar_grabacion`), archivos en `app_data_dir()/grabaciones/paciente_<id>/<id>.webm`, límite de seguridad de 300 MB por archivo. Scope del asset protocol ampliado para esta carpeta.
- [x] Listado con reproductor `<audio controls>` inline (vía asset protocol), botón "renombrar" (modal) y "eliminar" (modal de confirmación).
- [x] Nuevo ícono `mic` en `icon.component.ts`.
- [ ] **Pendiente de verificación manual por el usuario:** probar el flujo completo de grabar, reproducir, renombrar y eliminar una grabación (incluye aceptar el permiso de micrófono de WebView2 la primera vez).

### Detalle del paciente reorganizado en cards de navegación ✅ COMPLETADO (2026-09-26)
El detalle del paciente ya no muestra las listas incrustadas: **Sesiones**, **Citas** y **Evaluaciones** pasaron a ser cards clicables (mismo patrón que "Sesión de consulta" y "Grabación") que llevan a su propia pantalla, para un entorno más ordenado.
- [x] Nuevas pantallas (lógica movida tal cual desde `detalle-paciente.component`, sin cambios de comportamiento): `sesiones-paciente.component` (`/pacientes/:id/sesiones`: listado, registrar/editar/eliminar sesión, adjuntos con visor inline), `citas-paciente.component` (`/pacientes/:id/citas`: agendar/reprogramar/cancelar/eliminar con la lógica de estados) y `evaluaciones-paciente.component` (`/pacientes/:id/evaluaciones`: resultados, botón "Evaluar", eliminar). Cada una con el botón de acción principal en el header (como Grabación).
- [x] `DetallePacienteComponent` quedó reducido a: ficha del paciente + modal de eliminar paciente + 6 cards (Sesión de consulta, Evaluación Psicométrica [solo visual], Sesiones, Citas, Evaluaciones, Grabación). Ya no carga sesiones/citas/resultados/adjuntos al abrirse.
- [x] Rutas nuevas en `app.routes.ts`. Verificado dentro de la app real (vía CDP): las 4 pantallas cargan con datos reales, sin errores de consola. Pendiente de confirmación visual del usuario.

### Más color de marca (#6174B6) en fondos ✅ COMPLETADO (2026-09-26, pendiente de confirmación visual del usuario)
El usuario pidió introducir `#6174B6` en algunos fondos para que el sitio no se viera tan pálido. Ese color ya era `--color-clinico-secundario` (botones/acentos); ahora también es color pleno en regiones deliberadas.
- [x] `PageHeaderComponent` (todas las pantallas internas) y el header del Hub: banda sólida `bg-clinico-secundario` con texto blanco; "Volver" y las píldoras de acción del header quedan como píldoras claras con texto índigo oscuro.
- [x] Login: fondo completo índigo, logo dentro de un círculo con anillo blanco, tarjeta blanca sin cambios.
- [x] Círculos de ícono/iniciales que eran `bg-clinico-secundario/10` (hub, detalle de paciente, listados, recursos, tests) pasaron a índigo pleno con ícono blanco. Los círculos verdes (`clinico-primario`) y los badges de estado quedan tenues a propósito.
- [x] Nuevo token `--color-clinico-secundario-oscuro` (`#3d4d8c`) para texto pequeño sobre superficies claras; y `::selection` teñido de la marca.
- **Decisión: el lienzo `--color-clinico-fondo` (`#f8faf9`) NO se tocó**: coincide con el fondo del `logo-vitali.jpg` (`#f7f7f7`); teñirlo haría visible un recuadro alrededor del logo.
- Nota de contraste: blanco sobre `#6174B6` da 4.49:1 (igual que los botones existentes); por eso el texto sobre la banda se mantiene ≥14 px y el texto chico va en píldoras claras. Al agregar botones de acción en un header, usar `bg-clinico-fondo text-clinico-secundario-oscuro hover:bg-white` (un hover translúcido índigo sobre el header índigo haría desaparecer el texto).

## Estado actual (última actualización: 2026-09-26)

**Completado:** Todo lo anterior (fases 1-5, pulido visual, CRUD de pacientes/sesiones/citas con estados avanzados, módulo de Tests) más, en esta tanda de sesiones: el flujo clínico completo "Sesión de consulta" (Análisis funcional + Entrevista + Propuesta de intervención terapéutica), adjuntos con visor inline en las sesiones, el módulo "Recursos" del dashboard (biblioteca de PDFs con buscador y paginación), la integración push con Google Calendar, y el módulo de grabación de audio por paciente.

**Próximo paso:** el usuario debe verificar manualmente (a) que la conexión a Google Calendar funciona de punta a punta tras el fix del scope (crear una cita y confirmar que aparece en su Google Calendar), y (b) el flujo de grabación de audio (grabar, reproducir, renombrar, eliminar). Pendiente histórico sin retomar: especificar los requerimientos reales de "Plantillas" (generación de reportes, sigue siendo placeholder) y de "Evaluación Psicométrica" en el detalle del paciente (card actualmente solo visual). A más largo plazo: empaquetar un instalador de producción (`pnpm tauri build`) y considerar backup/exportación de `clinica.db` (que ahora también referencia carpetas externas: `adjuntos/`, `recursos/`, `grabaciones/` — un backup completo debe incluir esas carpetas, no solo el `.db`).

**Notas para la siguiente sesión:**
- El proceso `pnpm tauri dev` puede haber quedado corriendo en segundo plano de la sesión anterior; verificar el puerto 1420 (`netstat -ano | grep ":1420"`) y matar el proceso `node`/`tauri-app` residual antes de lanzar uno nuevo, para no duplicar instancias ni chocar de puerto.
- Los comandos Rust se registran en `src-tauri/src/lib.rs` dentro de `tauri::generate_handler![...]` — cada módulo nuevo debe importarse (`mod ...;`) y añadirse ahí. Módulos actuales: `auth`, `citas`, `db`, `entrevistas`, `google_calendar`, `grabaciones`, `pacientes`, `problemas`, `propuestas`, `recursos`, `sesiones`, `tests`, `adjuntos`.
- El estado de sesión del usuario vive en `sessionStorage` (se pierde al cerrar la ventana/webview); si se requiere persistencia entre reinicios de la app, reevaluar ese storage.
- Rusqlite/borrow-checker: al hacer una consulta con `stmt.query_map(...).collect(...)` y luego seguir usando la misma `Connection` en el mismo bloque (p. ej. para una transacción después), declarar el `Statement` en una variable nombrada y hacer `drop(stmt)` explícito tras el `collect` — si el `query_map` se encadena inline al final de un bloque `{ ... }`, el borrow checker de Rust puede fallar con E0597 porque el `Statement` temporal vive hasta el final del bloque. Ocurrió en `tests::registrar_resultado`.
- Patrón de almacenamiento de archivos (adjuntos de sesión, recursos, grabaciones): el backend siempre posee el disco — nunca se guardan bytes como BLOB en SQLite. Los archivos se copian/escriben en subcarpetas de `app_data_dir()`, la tabla solo guarda metadatos + `nombre_archivo` generado a partir del `id` autoincremental. La visualización dentro de la app (PDF/imágenes/audio) usa siempre el **asset protocol** de Tauri (`convertFileSrc` en el frontend + `scope` en `tauri.conf.json` + feature `protocol-asset` en `Cargo.toml`), nunca rutas `file://` crudas.
- Bindings de `src` con URLs del asset protocol (bug corregido 2026-09-26): en `<audio>`/`<img>` enlazar la URL como **string simple** (`convertFileSrc(ruta)`); envolverla con `DomSanitizer.bypassSecurityTrust*Url` hace que Angular escriba en el `src` el texto "SafeValue must use [property]=binding..." y el medio no carga (síntoma: reproductor deshabilitado, 0:00 / 0:00). `bypassSecurityTrustResourceUrl` es necesario **solo** para `<iframe>` (PDF). Además, los WebM de `MediaRecorder` pueden reportar duración `Infinity`; `corregirDuracion()` en `listado-grabaciones.component.ts` lo resuelve forzando un seek. Para depurar el WebView: lanzar con `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` y conectarse por CDP (`http://127.0.0.1:9222/json`); no dejar ese puerto abierto en uso normal.
- Cualquier llamada de red (hoy: solo Google Calendar) debe llevar un timeout corto explícito (`reqwest::blocking::Client::builder().timeout(...)`) — por defecto reqwest no tiene timeout y una acción local (crear una cita) podría quedar esperando mucho tiempo si no hay internet.
- Las credenciales de Google Cloud (Client ID/Secret) se guardan en la tabla `google_calendar_config`, configurables desde la UI (panel en Agenda) — deliberadamente **no** están hardcodeadas en el código, porque cada cliente/clínica necesita su propio proyecto de Google Cloud (ver `GOOGLE_CALENDAR_SETUP.md`).
