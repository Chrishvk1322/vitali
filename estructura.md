# Especificación Técnica y Plan de Proyecto: Sistema de Gestión de Historias Clínicas

---

## 1. Stack Tecnológico y Arquitectura

* **Entorno de Ejecución Desktop:** **Tauri v2** (Núcleo en Rust, comunicación nativa IPC en memoria, consumo ultra bajo de RAM: ~30-50 MB).
* **Frontend Framework:** **Angular 21** (Signals para reactividad granular, nueva sintaxis de control flow, Reactive Forms, compilación Ahead-of-Time).
* **Diseño y Estilos:** **Tailwind CSS v4** (Motor CSS optimizado, purgado automático, diseño responsivo adaptado para mouse en laptop y pantalla táctil en tablet).
* **Persistencia Local:** **SQLite** embebido (Almacenamiento en un único archivo local `.db`, acceso directo y seguro sin requerir servidores HTTP locales).

---

## 2. Sistema de Diseño y Paleta de Colores

* **Color Primario (Clínico / Calma):** `#A2C09A` (Verde Salvia) — Identidad visual, tarjetas informativas, estados de éxito y acentos secundarios.
* **Color Secundario (Acción / Foco):** `#6174B6` (Azul Pizarra / Índigo) — Botones de acción principal, estados activos, fechas marcadas en calendario y navegación destacada.
* **Fondo General:** `#F8FAF9` (Gris/blanco suave para reducir fatiga visual).
* **Tipografía y Contraste:** `#2C3437` (Gris carbón para lectura médica clara).
* **Bordes y Divisores:** `#E2E8F0` (Gris neutro claro).

---

## 3. Modelo de Datos y Entidades

### `roles`
* `id` (Identificador único, PK)
* `nombre` (Texto: `psicologo`, `admin`)

### `usuarios`
* `id` (Identificador único, PK)
* `username` (Texto, Único, No nulo)
* `password_hash` (Texto, No nulo)
* `nombres` (Texto, No nulo)
* `rol_id` (Identificador, FK -> `roles(id)`)
* `activo` (Booleano, por defecto `true`)
* `creado_en` (Fecha/Hora)

### `pacientes`
* `id` (Identificador único, PK)
* `apellidos_nombres` (Texto, Obligatorio)
* `edad` (Entero, Calculado o ingresado)
* `sexo` (Texto: `Femenino`, `Masculino`)
* `fecha_nacimiento` (Fecha: `YYYY-MM-DD`, Obligatorio)
* `lugar_nacimiento` (Texto)
* `grado_instruccion` (Texto: `Primaria`, `Secundaria`, `Superior`, `Técnico`, `Ninguno`)
* `ocupacion` (Texto)
* `estado_civil` (Texto: `Soltero/a`, `Casado/a`, `Conviviente`, `Divorciado/a`, `Viudo/a`)
* `num_hijos` (Entero / Opcional, permite opción "No tiene")
* `num_hermanos` (Entero / Opcional, permite opción "No tiene")
* `vive_con` (Texto)
* `domicilio` (Texto)
* `telefono` (Texto)
* `email` (Texto)
* `nombre_acompanante` (Texto)
* `fecha_consulta` (Fecha: `YYYY-MM-DD`, Obligatorio)
* `creado_en` (Fecha/Hora)
* `actualizado_en` (Fecha/Hora)

### `sesiones_seguimiento`
* `id` (Identificador único, PK)
* `paciente_id` (Identificador, FK -> `pacientes(id)`, Obligatorio)
* `fecha_hora` (Fecha y Hora)
* `resumen_tratado` (Texto largo, Resumen de lo tratado en la sesión)
* `observaciones` (Texto largo, Notas de seguimiento, acuerdos o tareas)
* `creado_en` (Fecha/Hora)

### `citas`
* `id` (Identificador único, PK)
* `paciente_id` (Identificador, FK -> `pacientes(id)`, Obligatorio)
* `fecha_hora_inicio` (Fecha y Hora)
* `fecha_hora_fin` (Fecha y Hora)
* `estado` (Texto: `Programada`, `Completada`, `Cancelada`)
* `notas` (Texto)
* `creado_en` (Fecha/Hora)

---

## 4. Mapa de Navegación y Flujo de Pantallas

### Flujo 1: Autenticación
* **Pantalla de Login:** 
  * Campos: Usuario y Contraseña.
  * Botón: Iniciar Sesión.
  * Valida credenciales contra la tabla `usuarios` y almacena el estado de sesión local.

### Flujo 2: Hub Principal (Dashboard)
* Barra superior con información de la psicóloga y botón de salida.
* 4 Accesos principales estructurados como tarjetas destacadas:
  1. **Pacientes**
  2. **Agenda**
  3. **Tests** (Preparado para requerimientos de evaluación psicométrica)
  4. **Plantillas** (Preparado para requerimientos de generación de reportes)

### Flujo 3: Módulo de Pacientes
* **Vista de Entrada (`/pacientes`):**
  * Presenta 2 botones de gran tamaño para selección rápida:
    * **[ + Nuevo Paciente ]**
    * **[ 📋 Listado de Pacientes ]**
* **Pantalla Nuevo Paciente:**
  * Formulario reactivo ordenado por secciones con todos los campos definidos en la entidad `pacientes`.
  * Botones: **Guardar Paciente** (Primario) y **Cancelar** (Secundario, retorna a la vista previa).
* **Pantalla Listado de Pacientes:**
  * Buscador interactivo por nombres/apellidos en tiempo real.
  * Tabla/tarjetas de pacientes con datos principales (Nombres, Edad, Teléfono, Fecha de Consulta).
  * Clic en cualquier registro redirige al **Detalle del Paciente**.
* **Pantalla Detalle del Paciente:**
  * Panel superior: Ficha técnica completa con datos sociodemográficos y familiares.
  * Panel inferior: **Botón "Sesiones"** que despliega el historial clínico.
    * Lista cronológica inversa (desde la sesión más reciente hacia la primera).
    * Cada registro muestra: Fecha, Hora, Resumen de lo tratado y Notas de seguimiento.
    * Acciones disponibles en pie de lista:
      * **[ Agregar Observación / Nueva Sesión ]** -> Modal con campos de texto, botón Guardar y Cancelar.
      * **[ Agendar Siguiente Cita ]** -> Modal con selector de fecha/hora precargando al paciente, botón Confirmar y Cancelar.

### Flujo 4: Módulo de Agenda (Calendario)
* **Vista Calendario:**
  * Cuadrícula mensual/semanal limpia.
  * Días con citas resaltados mediante los colores de la paleta (`#6174B6` / `#A2C09A`).
* **Vista Detalle del Día:**
  * Al pulsar sobre una fecha, muestra la lista horaria de citas programadas.
  * Cada tarjeta de cita muestra: Horario, Nombre del Paciente y Estado.
  * Acceso directo: Clic en el nombre del paciente navega directamente al **Detalle del Paciente**.
  * Acciones: Crear nueva cita y Cancelar cita.

---

## 5. Plan de Ejecución por Fases (Guía para el Agente Build)

* **Fase 1: Configuración del Proyecto y Autenticación**
  * Inicializar proyecto Tauri con Angular 21 y Tailwind CSS v4.
  * Configurar paleta de colores personalizada en Tailwind (`#A2C09A`, `#6174B6`).
  * Crear script de inicialización SQLite con las tablas `roles` y `usuarios`, sembrando el usuario inicial.
  * Construir vista de Login, guard de rutas y Hub Principal con las 4 tarjetas maestras.

* **Fase 2: Módulo de Pacientes (Registro y Listado)**
  * Crear la vista intermedia con los 2 botones principales.
  * Desarrollar el formulario reactivo completo para "Nuevo Paciente" con validaciones y botón Cancelar.
  * Implementar el "Listado de Pacientes" con filtro reactivo mediante Signals.

* **Fase 3: Detalle del Paciente y Sistema de Sesiones**
  * Construir la vista de ficha técnica detallada del paciente.
  * Implementar la consulta y renderizado cronológico inverso de las notas de evolución.
  * Crear los modales para "Agregar observación" y "Agendar siguiente cita", ambos con opción de cancelación.

* **Fase 4: Calendario y Sincronización de Agenda**
  * Implementar el componente de calendario con fechas coloreadas.
  * Crear el panel lateral/inferior de citas diarias vinculando la navegación hacia la ficha del paciente.

* **Fase 5: Preparación de Módulos Tests y Plantillas**
  * Crear las estructuras base y placeholders de navegación para Tests y Plantillas para su posterior implementación funcional.
