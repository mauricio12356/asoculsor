# Recuperación de contraseña de ASOCULSOR (GitHub Pages + Supabase)

La aplicación pública está en:

https://mauricio12356.github.io/asoculsor/

## 1. Configurar Supabase Auth (OBLIGATORIO)

1. Entra a https://supabase.com/dashboard/project/ehyamcioqwxfmzxegrev/auth/url-configuration
2. En **Site URL**, guarda exactamente:
   `https://mauricio12356.github.io/asoculsor/`
3. En **Redirect URLs**, añade también exactamente:
   `https://mauricio12356.github.io/asoculsor/`
4. Guarda las dos opciones.

Si el correo todavía apunta a `localhost`, inspecciona en Authentication → Email Templates → Reset Password que se use el enlace de confirmación de Supabase (`{{ .ConfirmationURL }}`), no una URL fija de pruebas. No modifiques el token manualmente.

## 2. Probar

1. Abre la web pública desde un navegador normal.
2. Pulsa «¿Olvidaste tu contraseña?».
3. Escribe el correo de una cuenta de prueba existente.
4. Abre en Gmail el correo **más reciente**, y pulsa el enlace.
5. Debe mostrarse «Establecer contraseña» y la casilla «Nueva contraseña».
6. Cambia la contraseña por una de 12 o más caracteres.
7. Comprueba que ya puedes iniciar sesión con ella.

No compartas enlaces de recuperación con nadie: contienen tokens privados. Los enlaces anteriores pueden caducar o haber sido usados. En ese caso pide uno nuevo.

## 3. Qué hacer si falla

- Si abre `localhost`: corrige **Site URL** y **Redirect URLs** en Supabase como arriba y solicita otro correo.
- Si abre GitHub pero dice «enlace vencido»: pide otro correo, abre solo el último y evita abrirlo varias veces.
- Si aparece 404: usa la URL exacta del proyecto, incluyendo `/asoculsor/`.
- Si el navegador muestra un error diferente, describe el texto del error **sin copiar el enlace con el token**.

El código público utiliza `config.js` para indicar la URL oficial de recuperación y `assets/app.js` para manejar el token de Supabase.
