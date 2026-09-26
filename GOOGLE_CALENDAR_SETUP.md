# Configuración de Google Calendar para Vitali

Esta guía explica cómo crear un proyecto de Google Cloud para que las citas
agendadas en Vitali se sincronicen automáticamente como eventos en el Google
Calendar del cliente (la clínica). Cada instalación de Vitali para un cliente
distinto necesita su propio proyecto de Google Cloud.

## 1. Crear el proyecto

1. Entra a https://console.cloud.google.com/ con la cuenta de Google del
   cliente (o la de la clínica). El proyecto debe quedar bajo su propiedad,
   no la tuya, para que la integración no dependa de tu cuenta personal.
2. En el selector de proyectos (arriba), haz clic en **"Nuevo proyecto"**.
3. Nómbralo, por ejemplo, `Vitali - [Nombre Clínica]` y créalo.

## 2. Habilitar la Google Calendar API

1. Con el proyecto seleccionado, ve a **"APIs y servicios" → "Biblioteca"**.
2. Busca **"Google Calendar API"** y haz clic en **"Habilitar"**.

## 3. Configurar la pantalla de consentimiento OAuth

1. Ve a **"APIs y servicios" → "Pantalla de consentimiento de OAuth"**.
2. Tipo de usuario: **Externo** (salvo que el cliente tenga Google Workspace,
   en cuyo caso puede usar "Interno").
3. Completa el nombre de la app (`Vitali`), un correo de soporte y un correo
   de contacto del desarrollador.
4. En **"Público"**, se puede dejar como **"En prueba"** al inicio. Más
   adelante conviene pasarlo a **"En producción"** (ver paso 7) para que el
   acceso no expire cada 7 días.
5. Guarda.

## 4. Agregar el scope de Calendar

En la misma sección de consentimiento, en **"Permisos" (Scopes)**, agrega:

```
https://www.googleapis.com/auth/calendar.events
```

Este scope permite crear, editar y eliminar eventos, sin acceso a otros datos
del calendario del usuario.

## 5. Agregar al cliente como test user

Mientras la app esté en modo **"En prueba"**, en **"Usuarios de prueba"**
agrega el correo de Gmail de la cuenta que va a conectar su calendario
(normalmente la del propio cliente/clínica).

## 6. Crear las credenciales OAuth

1. Ve a **"APIs y servicios" → "Credenciales" → "Crear credenciales" → "ID de
   cliente de OAuth"**.
2. Tipo de aplicación: **"App de escritorio"**.
3. Nómbralo, por ejemplo, `Vitali Desktop`.
4. Al crearlo, Google muestra el **Client ID** y el **Client Secret**.
   Cópialos: son los que se ingresan en Vitali (ver sección siguiente).

> El *Client Secret* de una app de tipo "Escritorio" no se trata como un
> secreto real por parte de Google (no hay forma de mantenerlo oculto en un
> binario que corre en la máquina del usuario), así que no hay problema en
> guardarlo dentro de la configuración local de la app.

## 7. Pasar a producción (recomendado)

Una vez que se probó que la conexión funciona con el test user:

1. Vuelve a **"Pantalla de consentimiento de OAuth"**.
2. Cambia el estado de **"En prueba"** a **"En producción"**.

Con esto, el cliente verá una sola vez la advertencia *"Google no ha
verificado esta app"* al conectar su cuenta (debe hacer clic en "Avanzado" →
"Ir a Vitali (no seguro)"), pero después el acceso ya no expira cada 7 días
como ocurre en modo "En prueba". No hace falta completar el proceso de
verificación completo de Google (video, política de privacidad, revisión
manual) porque el scope de Calendar usado es "sensible" pero no
"restringido".

## 8. Configurar las credenciales dentro de Vitali

1. Abre Vitali y entra al módulo **Agenda**.
2. Haz clic en el botón **"Google Calendar"** (ícono de engranaje, arriba a
   la derecha).
3. Pega el **Client ID** y el **Client Secret** obtenidos en el paso 6 y
   guarda.
4. Haz clic en **"Conectar cuenta"**: se abrirá el navegador para iniciar
   sesión con la cuenta de Google del cliente y autorizar el acceso.
5. Una vez autorizado, Vitali queda conectado a esa cuenta y las citas que se
   agenden, reprogramen, cancelen o eliminen se reflejarán automáticamente en
   el Google Calendar de esa cuenta.

Si en algún momento se necesita desconectar la cuenta o conectar una
distinta, se puede hacer desde el mismo panel con el botón
**"Desconectar"**.
