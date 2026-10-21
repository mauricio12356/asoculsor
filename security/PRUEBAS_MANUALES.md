# Pruebas mínimas de aceptación y seguridad — ASOCULSOR

**Preparación:** instalar proyecto real, crear 3 cuentas diferentes y activarlas como `admin`, `coordinador`, `operador`. Para completar pruebas negativas se requiere un usuario sin activar. **No usar datos personales**; inventa un beneficiario ficticio.

- [ ] Sin URL/clave Supabase en `config.js` muestra "Conecta Supabase" y ningún botón de entrada demo.
- [ ] Inicio de sesión con contraseña incorrecta: rechazo; no se crea sesión.
- [ ] Cuenta confirmada pero `active=false`: no puede acceder a los datos.
- [ ] Operador puede registrar beneficiario, cita, actividad e inscribir en programa activo.
- [ ] Operador no puede ver donaciones, documentos privados, la administración de usuarios ni la auditoría.
- [ ] Operador: probar llamada REST directa autenticada con `GET /rest/v1/donations?select=*` (debe devolver lista vacía) y `POST` (debe fallar por RLS).
- [ ] Operador: llamada `GET /rest/v1/documents?select=*` no devuelve expedientes. No puede descargar enlaces privados de Storage.
- [ ] Operador no puede eliminar beneficiarios ni citas; coordinador tampoco; administrador sí.
- [ ] Coordinador puede administrar programas y documentos privados, pero no editar perfiles ni borrar donaciones.
- [ ] Administrador puede habilitar cuentas, pero no deshabilitar al último administrador ni modificar email de `profiles`.
- [ ] Intentar introducir `created_by` de otra persona por API; la base registra el usuario autenticado real.
- [ ] Registrar cambios: se generan filas en `audit_logs`; operador no puede verlas ni modificarlas.
- [ ] Subir documento permitido; solo admin/coordinador puede abrir enlace temporal privado. Archivo mayor a 10MB es rechazado.
- [ ] Un archivo descargado por enlace temporal caduca; **nota:** un enlace previamente compartido puede ser visto por cualquiera que lo tenga hasta expirar.
- [ ] Recuperación de contraseña, verificación de email, cierre de sesión y reapertura tras cerrar la pestaña.
- [ ] Confirmar respaldo y restauración antes de usar información real.

Si falla una prueba, **no procesar datos reales** hasta corregirla.
