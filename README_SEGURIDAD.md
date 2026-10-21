# Fundación ASOCULSOR · Centro Cuatro de Enero
## Sistema REAL — instalación y seguridad

**Entrega:** aplicación HTML/CSS/JavaScript sin compilación, backend administrado **Supabase Auth + PostgreSQL + Storage**, y permisos **RLS aplicados en el servidor**. No hay backend Express porque los endpoints REST de Supabase son el backend. El proyecto no incluye una base Supabase remota ni datos reales: debes conectar **tu** proyecto antes de operar.

### 1) Instalación inicial

1. Crea un proyecto privado en <https://supabase.com/dashboard>, activa **Authentication → Providers → Email** y confirmación de correo, y guarda la contraseña de DB solo en tu gestor de contraseñas.
2. Ve a **SQL Editor → New query** y ejecuta **TODO** `database/schema.sql` UNA SOLA VEZ. Crea las tablas, triggers, roles, reglas RLS y el bucket **privado** `expedientes` de 10 MB por archivo. No contiene beneficiarios ni credenciales de ejemplo.
3. En **Connect** o **Project Settings → API Keys** copia la **Project URL** y la clave **`sb_publishable_...`** (también funciona `anon` pública legada). Edita `config.js`:

   ```js
   window.ASOCULSOR_CONFIG = {
     supabaseUrl: 'https://tu-proyecto.supabase.co',
     supabaseKey: 'sb_publishable_xxxx',
     demoOnly: false
   };
   ```

   **PROHIBIDO** pegar claves `service_role`, `sb_secret_`, el password de PostgreSQL o contraseñas de personas en `config.js`. Esa información nunca debe salir del servidor.
4. Inicia la app en HTTP: desde esta carpeta abre una terminal y ejecuta `py -m http.server 5500`; visita `http://localhost:5500`. También puedes publicar la carpeta en hosting HTTPS con CSP/headers aplicados (ver abajo).
5. Configura en **Authentication → URL Configuration** el Site URL y los Redirect URLs de tu sitio (para recuperación y confirmación). Asegúrate de que la URL coincida con la del navegador.
6. En la web abre **Solicitar acceso**, registra tu **correo propio** con una contraseña única y confírmalo. En SQL Editor habilita **solo a esa cuenta**:

   ```sql
   UPDATE public.profiles SET role='admin',active=true
   WHERE id=(SELECT id FROM auth.users WHERE email='TU_CORREO@DOMINIO.COM');
   ```

   Verifica que se haya actualizado exactamente 1 fila antes de continuar. Si no, revisa que confirmaste el correo y que el trigger creó `profiles`.
7. Inicia sesión. Los demás usuarios solicitan cuenta y permanecen **bloqueados** hasta que el administrador los active en **Usuarios y roles**.

### 2) Instalación anterior (sin perder información)

Si YA ejecutaste `database/schema.sql` de una versión anterior, **NO** vuelvas a ejecutar el archivo base. En lugar de eso, ejecuta únicamente `database/002_seguridad_reforzada.sql`. Antes haz una copia de respaldo y verifica el resultado. Este archivo reemplaza políticas RLS antiguas sin borrar beneficiarios ni citas.

### 3) Roles de acceso efectivos (en la base de datos)

| Función | Administrador | Coordinador | Operador |
|---|---|---|---|
| Beneficiarios, inscripciones, actividades, asistencia, citas | Leer y escribir | Leer y escribir | Leer y escribir |
| Borrar beneficiarios y citas | Sí | No | No |
| Programas (cambios) | Sí | Sí | No |
| Donaciones | Ver/editar/borrar | Ver/editar | Sin acceso |
| Documentos privados (PDF, imagen, DOCX) | Acceso | Acceso | Sin acceso |
| Usuarios / asignación de roles | Sí | No | No |
| Auditoría | Ver | Ver | Sin acceso |

Un operador activo accede a los registros operativos de **toda la fundación**. Si necesitas restringir por profesional asignado/beneficiario, deberás añadir ese modelo antes de almacenar expedientes clínicos o información altamente sensible. Los controles no se basan solo en ocultar el botón, sino en **RLS en PostgreSQL** y políticas de Supabase Storage.

### 4) Medidas de seguridad incluidas

- Sin contraseñas ni administrador por defecto. Registro nuevo inactivo; requiere confirmación/aprobación.
- Sesiones en `sessionStorage` del navegador (se cierran al finalizar la sesión/pestaña). Tokens borrados de `localStorage` de versiones antiguas.
- Funciones PostgreSQL con privilegios elevados en esquema privado no expuesto por REST.
- Validación de permisos por operación y rol; se restringe el acceso anónimo a las tablas.
- Identidad del autor protegida por triggers para que la API no pueda falsificar `created_by`, `recorded_by`, `uploaded_by`.
- Auditoría servidor INSERT/UPDATE/DELETE sin copiar datos sensibles; no editable mediante clientes normales.
- Protección contra bloquear al último administrador, cambios ilegítimos al correo del perfil y cambio de nombre/ruta del archivo.
- Storage privado, límite de tamaño y tipos MIME, rutas por usuario y enlaces de acceso con caducidad de 120 s.
- Escape de texto HTML y exportaciones Excel con valores escritos como texto seguro.
- Exportaciones `.xlsx` por módulo e informes, con encabezados, columnas ajustadas y orden alfabético o cronológico.
- Política CSP básica en el HTML real; cabeceras de hosting complementarias en `security/headers_cloudflare_netlify.txt`.

### 5) Antes de usar datos reales de beneficiarios

**No declarar el sistema 'seguro al 100 %':** el código fue revisado y cuenta con pruebas de interfaz locales, pero **no se ha desplegado ni sometido a pentest** contra tu proyecto Supabase. Además, `disability_type`, observaciones y documentos pueden ser datos personales sensibles. Antes de uso real:

1. Con consentimiento/base legal y política de privacidad, definir finalidad, responsable y plazos de conservación, bajo la normativa aplicable en Ecuador (incluida LOPDP, evaluar según asesoría legal).
2. Desplegar **solo bajo HTTPS** con CSP y cabeceras; usar contraseñas robustas, verificar correo, activar control antiabuso/CAPTCHA y límites en Supabase Auth. Considerar autenticación multifactor para personal autorizado; esta versión **no implementa el flujo MFA**.
3. Revisar quién debe ver cada expediente. Actualmente los **operadores activos ven todos los beneficiarios**; restringir por profesional/caso si el centro lo requiere.
4. Establecer copias de seguridad **verificadas** y pruebas de restauración; el plan gratuito de Supabase no debe asumirse como respaldo suficiente para la fundación.
5. Probar permisos con 3 cuentas separadas y **no** cargar datos personales hasta confirmar los resultados. Comprobar eliminación, archivos adjuntos, auditoría y restablecimiento de contraseña.
6. Añadir antivirus/escaneo de adjuntos, políticas de retención, gestión de incidentes y monitoreo de alertas antes de operación institucional con información sensible.

### 6) Comprobaciones básicas

En SQL Editor ejecuta el siguiente SELECT; debe indicar RLS `true` en las 10 tablas:

```sql
SELECT schemaname,tablename,rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN
 ('profiles','beneficiaries','programs','enrollments','activities',
  'attendance','appointments','donations','documents','audit_logs')
ORDER BY tablename;
```

Luego prueba con tres cuentas (admin, coordinador, operador). Como operador, intentar leer por API `/rest/v1/donations?select=*` devuelve **sin filas**; intentar INSERT da `403`/error RLS. Lo mismo para `/rest/v1/documents` y objetos privados de `expedientes`. Un usuario pendiente no debe ver beneficiarios. Ver lista de pruebas en `security/PRUEBAS_MANUALES.md`.

### 7) Demo vs. app real

- `index.html`: sistema real; **NO** deja acceder si `config.js` está sin conectar.
- `VISTA_PREVIA.html`: demostración autónoma y separada, con **datos ficticios almacenados localmente**. No utilizar con información personal.

### 8) Desarrollo local

```powershell
cd ASOCULSOR_Produccion_Segura
py -m http.server 5500
```

En VS Code también funciona **Live Server**. Los endpoints de autenticación y PostgreSQL corren en Supabase, no en tu equipo.
