# ASOCULSOR · dominio, Render y correos con Brevo

**Repositorio:** https://github.com/mauricio12356/asoculsor  
**GitHub Pages actual:** https://mauricio12356.github.io/asoculsor/  
**Supabase:** https://supabase.com/dashboard/project/ehyamcioqwxfmzxegrev

## 1. Qué despliega Render
El archivo `render.yaml` ya está agregado. Define un sitio **estático gratuito** llamado `asoculsor-gestion` que publica exclusivamente `index.html`, `config.js` y `assets/`. Render asignará una dirección `https://...onrender.com` cuando el servicio se cree.

Esta publicación corresponde a la aplicación HTML/JavaScript del repositorio. **No equivale** al sistema independiente Python/FastAPI de 34 requerimientos guardado en otro ZIP. GitHub Pages y Render pueden mostrar la aplicación web al mismo tiempo. Supabase gestiona autenticación, PostgreSQL y archivos.

**Para activarlo:** abre https://dashboard.render.com/ y crea un Blueprint a partir del repositorio `mauricio12356/asoculsor`, o un Static Site con:
- Source: repositorio GitHub `mauricio12356/asoculsor`
- Branch: `main`
- Build command: `mkdir -p site && cp index.html config.js site/ && cp -R assets site/`
- Publish directory: `site`

No pegues contraseñas, API keys secretas ni la cadena `DATABASE_URL` en el repositorio o en el navegador. Esta versión utiliza exclusivamente la clave **publicable** de Supabase.

## 2. Configurar correos de confirmación y recuperación con Brevo
La aplicación envía solicitudes a **Supabase Auth**. Por tanto, el SMTP de **Brevo debe configurarse en Supabase**, no en el sitio estático de Render.

**Brevo**
1. En https://app.brevo.com/settings/keys/smtp crea o localiza una **clave SMTP** (distinta a una API key).
2. Ve a Remitentes/Dominios, verifica un remitente y autentica el dominio con las entradas DNS de SPF, DKIM y DMARC que te indique Brevo. Para producción es recomendable un dominio propio; `onrender.com` NO es un dominio que puedas usar como remitente en Brevo.
3. Anota host `smtp-relay.brevo.com`, puerto `587` (STARTTLS), nombre de usuario SMTP y clave SMTP privada.

**Supabase**
1. Abre https://supabase.com/dashboard/project/ehyamcioqwxfmzxegrev/auth/smtp
2. Activa **Custom SMTP** y escribe:
   - Sender email: un remitente que ya verificaste en Brevo
   - Sender name: `Fundación ASOCULSOR`
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: usuario SMTP de Brevo
   - Password: clave SMTP privada de Brevo
3. Guarda los cambios.
4. En https://supabase.com/dashboard/project/ehyamcioqwxfmzxegrev/auth/url-configuration establece **Site URL** y **Redirect URLs** con direcciones exactas:
   - `https://mauricio12356.github.io/asoculsor/`
   - `https://DOMINIO-REAL-ASIGNADO.onrender.com/` (reemplazar por el dominio real, sin inventarlo)
   Se recomienda mantener como Site URL el dominio principal elegido y agregar el segundo a Redirect URLs.
5. En **Authentication → Email Templates**, confirma que los correos de «Confirm signup», «Reset password» utilicen el enlace de confirmación `{{ .ConfirmationURL }}`, no un enlace fijo a localhost.

No ingreses la clave SMTP ni la contraseña de un usuario en GitHub. El correo de recuperación contiene tokens privados: no compartas esas URL completas con terceros.

## 3. Validar correos Gmail, Outlook, Yahoo y otros
La validación se realiza mediante **confirmación del enlace enviado a cada destinatario**. No existe un sistema que garantice que todos los buzones del mundo existan o acepten los correos. Brevo permite enviar correos a proveedores habituales, sujeto a dirección válida, reputación, filtros antispam, autenticación de dominio y límites de servicio.

Prueba con cuentas propias o de prueba:
1. Solicita registro desde el dominio público y confirma desde Gmail, Outlook o Yahoo.
2. Usa «¿Olvidaste tu contraseña?» para solicitar un enlace nuevo.
3. Abre el **correo más reciente** y comprueba que muestra la pantalla «Establecer contraseña».
4. Guarda una contraseña nueva, cierra sesión y verifica que puedes entrar.
5. Revisa la sección de correos transaccionales de Brevo cuando haya problemas de entrega.

## 4. DNS y dominio
- Dominio gratuito incluido por GitHub Pages: `https://mauricio12356.github.io/asoculsor/`
- Subdominio gratuito incluido por Render: `https://nombre-asignado.onrender.com` una vez desplegado
- Un dominio propio `www.asoculsor.org` **no es gratuito automáticamente**; hace falta registrarlo o disponer de él y configurar DNS.

## 5. Estado
- [x] Código GitHub existente preparado con Blueprint Render.
- [x] Registro y recuperación redirigen al dominio en el que se abrió el sitio.
- [ ] Crear sitio en la cuenta Render y verificar URL asignada.
- [ ] Autorizar URL de Render en Supabase Authentication.
- [ ] Activar SMTP Brevo en Supabase con credenciales privadas.
- [ ] Verificar email de prueba en al menos Gmail y Outlook.
- [ ] Verificar los permisos RLS y las operaciones reales con cuentas de prueba.

**Muy importante:** Esta guía corresponde a la aplicación web de GitHub actual; no debe considerarse certificado el cumplimiento de todos los requisitos RF/RNF del ZIP independiente FastAPI.
