# ASOCULSOR

### Plataforma de gestión institucional · Centro Cuatro de Enero

Aplicación web para organizar beneficiarios, programas, inscripciones, actividades, asistencia, citas, donaciones y documentos. Usa **Supabase Auth, PostgreSQL, Row Level Security (RLS) y Storage privado** como backend.

> **Importante:** este repositorio contiene el código de la aplicación, no una base de datos lista para producción. Antes de operar, conecta tu proyecto Supabase, aplica el esquema SQL y valida los permisos con cuentas de prueba. No cargues datos personales hasta completar esas verificaciones.

## Contenido

- [Características](#características)
- [Tecnología](#tecnología)
- [Inicio rápido](#inicio-rápido)
- [Configurar Supabase](#configurar-supabase)
- [Instalaciones anteriores](#instalaciones-anteriores)
- [Roles](#roles)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Licencia](#licencia)

## Características

- Inicio de sesión, solicitud de acceso y recuperación de contraseña mediante Supabase Auth.
- Perfiles y permisos por rol, respaldados por políticas RLS en PostgreSQL.
- Gestión de beneficiarios, programas, inscripciones, actividades, asistencia, citas y donaciones.
- Documentos en un bucket privado de Supabase Storage.
- Auditoría de operaciones y validación de permisos en el servidor.
- Exportación a Excel `.xlsx` con columnas ajustadas, encabezados y orden alfabético o cronológico.
- Vista previa separada con datos ficticios para explorar la interfaz sin conectarse a la base real.
- Interfaz web adaptable a escritorio y móvil, sin proceso de compilación.

## Tecnología

- HTML, CSS y JavaScript nativo.
- Supabase Auth, PostgreSQL, REST API, RLS y Storage.
- No requiere Node.js ni un paso de compilación para ejecutar la aplicación.

## Inicio rápido

### Requisitos

- Un proyecto de Supabase.
- Windows PowerShell, incluido en Windows, para el servidor local.
- Una clave pública `sb_publishable_...` del proyecto. La clave `anon` pública legada también es compatible.

### 1. Descargar el proyecto

Clona el repositorio:

```powershell
git clone https://github.com/mauricio12356/asoculsor.git
cd asoculsor
```

### 2. Preparar la base de datos

En Supabase, abre **SQL Editor** y ejecuta el archivo completo `database/schema.sql` una sola vez para una instalación nueva. Configura también el proveedor de correo en **Authentication → Providers → Email**.

### 3. Conectar la aplicación

En **Project Settings → API Keys**, copia la **Project URL** y la clave `sb_publishable_...`. En `config.js`, establece los valores:

```js
window.ASOCULSOR_CONFIG = {
  supabaseUrl: 'https://TU-PROJECT-REF.supabase.co',
  supabaseKey: 'sb_publishable_TU_CLAVE_PUBLICA',
  demoOnly: false
};
```

La clave publicable está diseñada para usarse desde el navegador y será visible en el código cliente. **Nunca** pongas en `config.js` la contraseña de PostgreSQL ni claves `service_role` o `sb_secret_`.

### 4. Iniciar en Windows

Abre `INICIAR_SISTEMA_REAL.bat`. Se abrirá una ventana del servidor y el navegador visitará el sitio automáticamente en <http://localhost:5500>. Mantén abierta la ventana del servidor mientras usas la aplicación; pulsa `Ctrl+C` para detenerlo.

La aplicación real es `index.html`. Si el puerto 5500 ya está ocupado, cierra la otra aplicación y vuelve a ejecutar el iniciador.

Para ver la demostración local con datos ficticios, abre `INICIAR_DEMO.bat` o `VISTA_PREVIA.html`. La demo está separada y no debe usarse para registrar información real.

### 5. Crear el primer administrador

Registra una cuenta desde **Solicitar acceso**, confirma el correo y luego habilita únicamente esa cuenta desde SQL Editor, reemplazando el correo de ejemplo:

```sql
UPDATE public.profiles
SET role = 'admin', active = true
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'TU_CORREO@DOMINIO.COM'
);
```

Verifica que se haya actualizado exactamente una fila. Después, los demás usuarios pueden solicitar acceso y el administrador puede aprobarlos desde **Usuarios y roles**.

## Instalaciones anteriores

Si ya instalaste una versión previa de la base de datos, **no vuelvas a ejecutar** `database/schema.sql`. Haz primero una copia de seguridad y aplica únicamente la migración `database/002_seguridad_reforzada.sql`, siguiendo las instrucciones de [README_SEGURIDAD.md](README_SEGURIDAD.md).

## Roles

| Permiso | Administrador | Coordinador | Operador |
| --- | :---: | :---: | :---: |
| Operaciones de beneficiarios, inscripciones, actividades, asistencia y citas | Sí | Sí | Sí |
| Cambios en programas | Sí | Sí | No |
| Administrar usuarios y roles | Sí | No | No |
| Donaciones | Ver y administrar | Ver y editar | Sin acceso |
| Documentos privados | Acceso | Acceso | Sin acceso |
| Auditoría | Ver | Ver | Sin acceso |

Las restricciones se aplican en la base de datos con RLS, no solo ocultando controles en la interfaz. Actualmente, el personal operativo activo puede consultar los registros operativos de toda la fundación; revisa si ese alcance es adecuado para tu organización antes de cargar datos.

## Seguridad y privacidad

La aplicación puede manejar información personal y datos sensibles. Antes de usarla con personas reales:

1. Revisa [README_SEGURIDAD.md](README_SEGURIDAD.md), las [pruebas manuales](security/PRUEBAS_MANUALES.md) y las cabeceras recomendadas en `security/headers_cloudflare_netlify.txt`.
2. Configura URL de sitio y redirecciones de Supabase Auth para el dominio que vayas a usar.
3. Publica únicamente con HTTPS y verifica políticas RLS, Storage y acceso con cuentas separadas para cada rol.
4. Establece base legal, consentimiento, política de privacidad, retención y copias de seguridad según la normativa aplicable.
5. No afirmes que el sistema está certificado o probado contra un proyecto Supabase de producción: configura y valida tu instancia antes de operar.

## Estructura del proyecto

```text
.
├── assets/                 # JavaScript y estilos de la aplicación
├── capturas/               # Imágenes de referencia de la interfaz
├── database/               # Esquema inicial y migración de seguridad
├── security/               # Pruebas manuales y cabeceras recomendadas
├── tests/                  # Prueba de humo de interfaz
├── config.js               # URL y clave publicable del proyecto
├── index.html              # Aplicación real
├── VISTA_PREVIA.html       # Demostración con datos ficticios
├── INICIAR_SISTEMA_REAL.bat
├── INICIAR_DEMO.bat
├── README.md
└── README_SEGURIDAD.md
```

## Pruebas

La guía de validación de permisos está en `security/PRUEBAS_MANUALES.md`. La prueba automatizada de interfaz está en `tests/smoke_browser.py` y requiere Python y Playwright con Chromium configurado. Estas pruebas no sustituyen la comprobación de RLS en tu propio proyecto Supabase.

## Despliegue

Puedes publicar los archivos estáticos en un hosting HTTPS que permita configurar cabeceras de seguridad, como Cloudflare Pages o Netlify. Supabase proporciona los servicios de autenticación, base de datos y almacenamiento; el hosting estático no reemplaza a Supabase.

GitHub Pages puede servir una demostración pública del sitio, pero no se recomienda para alojar expedientes personales o documentos confidenciales. La configuración del navegador y la clave publicable son visibles en cualquier web estática: la protección de datos depende de RLS y de la configuración segura del proyecto Supabase.

## Licencia

Este repositorio no incluye un archivo de licencia. Su visibilidad pública permite consultar el código, pero no concede por sí misma permisos adicionales de uso, redistribución o modificación.
