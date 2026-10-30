# FAST TRIP — Operadores por ciudad
Decisión: 30 de octubre de 2026.

## Estados de lanzamiento
- Guayaquil: Disponible (ciudad inicial).
- Quito: Próximamente, no habilitar registros operativos ni despacho.
- Cuenca: Próximamente, no habilitar registros operativos ni despacho.

## Modelo de autorización
- Administrador principal: único rol con autorización para aprobar/rechazar conductores y pasajeros, activar ciudades, modificar tarifas, gestionar cobros, bloquear unidades y administrar operadores.
- Operador: acceso de solo lectura a viajes y conductores de su ciudad; puede gestionar atención al cliente y registrar incidentes sin cambiar estados administrativos.
- No permitir que un operador lea datos de otras ciudades.
- Auditar las acciones de operadores con actor, ciudad, marca temporal y acción.
- El código de invitación debe ser temporal y de un solo uso, con autenticación adicional y posibilidad de revocación.
- Aplicar políticas RLS y validaciones del lado del servidor. Nunca confiar solo en controles ocultos en la interfaz.
- El estado de ciudades debe almacenarse en base de datos y validarse en registro, asignación y despacho; la etiqueta "Próximamente" por sí sola no bloquea operaciones.

## Estado de implementación
Interfaz preliminar en operadores/index.html. No se ha desplegado autenticación, RLS, base de datos de ciudades ni aplicación instalable. No habilitar operadores hasta completar y probar estos controles.
