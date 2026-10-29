# FAST TRIP — Auditoría previa a Google Play (29-10-2026)

Rama de trabajo: `preparacion-android-2026-10-28`. No equivale a aprobación ni publicación de Google Play.

## Hallazgos comprobados
- `conductor/index.html`: contiene recuperación de contraseña y enlace de Central WhatsApp; no se identificó opción explícita de eliminación de cuenta.
- `pasajeros/index.html`: contiene recuperación de contraseña; no se identificó opción explícita de eliminación de cuenta.
- No se encontró uso de `navigator.geolocation` en estos dos archivos HTML. Verificar implementación real de GPS, permisos y seguimiento antes de afirmar que funcionan.
- `conductor/manifest.webmanifest` existe.
- `pasajeros/manifest.webmanifest` no existe en la ruta examinada. Verificar estructura y agregar manifiesto si se conserva PWA.
- No se verificó ningún archivo AAB/APK ni la configuración de compilación Android.

## Correcciones y verificaciones prioritarias
1. Definir y desarrollar solicitud autenticada de eliminación de cuenta, tratamiento de datos y página web de solicitud, sin eliminar registros sujetos a retención legal.
2. Implementar y probar ubicación en contexto de servicio, permisos mínimos y divulgación clara; justificar ubicación en segundo plano solo si es imprescindible.
3. Auditar permisos Android, `targetSdk`, firma, dependencias y compilación AAB para cada app independiente.
4. Validar política de privacidad, seguridad de datos, manejo de selfies, documentos, direcciones y teléfonos, políticas de almacenamiento y acceso.
5. Verificar reglas de aprobación administrativa, permisos de Supabase y que un conductor bloqueado no pueda recibir viajes.
6. Verificar formularios de Play Console: acceso para revisión, contenido, clasificación, condición de comerciante y requisitos de pruebas de cuenta.
7. Probar instalación y funciones principales en dispositivos Android reales.
8. Revisar tratamiento de pagos por transporte y de cuota de habilitación de conductor por separado.

## Estado
Auditoría inicial documentada. No declarar correcciones funcionales completadas hasta modificar código y ejecutar pruebas. No publicar sin verificación.
