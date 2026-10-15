# Matriz de producto — Field Pilot V2

Versión 0.11.0-field.2. «Estable» significa cubierto por regresión para un piloto controlado, no certificación ni garantía en todo dispositivo. Todo dato operativo vive en este navegador. Las pruebas sintéticas nunca se incorporan al catálogo de la aplicación.

| Capacidad | Estado y alcance | Entrada |
|---|---|---|
| Onboarding, institución, biblioteca, responsable | Estable; limitado por modo local | Ingreso / Organización |
| Ciclos lectivos, cursos/divisiones, asignaciones | Estable; historial anual local | Organización |
| Personas, perfiles, permisos, suplencias y permisos temporales | Estable; selector local, sin autenticación remota | Personas / Acceso / Organización |
| Catálogo, obra, edición, ejemplar, código AB | Estable; AB único dentro de la institución | Catálogo / Ejemplares |
| Búsqueda, temas y contenidos internos | Estable; busca información registrada, no inventa contenidos | Catálogo |
| ISBN y metadatos externos | Dependiente de Internet; proveedores pueden no responder | Agregar / Jornada |
| Jornada, repetidos, revisión y lote | Estable; requiere decisión humana ante coincidencias | Jornada de catalogación |
| OCR, foto de índice, sumario y titular | Experimental; motor local, resultado propuesto y confirmado | Asistencia |
| Cámara y lector de códigos | Experimental en hardware; BarcodeDetector/ZXing y alternativa manual | Agregar / Mostrador |
| Fotos de ejemplares | Estable; local, limitada por espacio del navegador | Ficha |
| Duplicados y coincidencias de obra | Estable como sugerencia; nunca fusiona automáticamente | Calidad / Jornada |
| Etiquetas QR/Code128 e impresión | Estable en DOM; verificar papel y lector real | Etiquetas |
| Préstamos, devoluciones, renovaciones, reservas, Mostrador | Estable; operaciones locales | Mostrador / Circulación / Reservas |
| Inventario por zona y rápido | Estable; faltante sin escanear no equivale a pérdida | Inventario |
| Estado físico, cuidado y atención | Estable; restricciones conservan historial | Ejemplar / Atención |
| Hemeroteca, diarios, revistas, números y artículos | Estable; se presta/reserva el ejemplar del número | Hemeroteca |
| Proyectos, listas, experiencias y contenido interno | Estable; privacidad según autor y aprobación | Mis proyectos |
| Mi biblioteca, guardados y necesidades de colección | Estable; datos propios y resolución explícita | Mi biblioteca / Colección |
| Analítica e historial | Estable; agregados explicables, sin ranking personal | Analítica |
| Red Escolar y cooperación | Limitado por modo local; snapshots manuales, sin tiempo real ni envío | Red Escolar |
| Migración CSV y Aguapey/MARC | Estable para formatos soportados; preview y conflictos requieren revisión | Migración |
| Backup / restauración | Estable dentro de límites documentados; archivo a cargo de la persona | Configuración / Ingreso |
| Piloto, observaciones e informe | Estable; no envía tickets ni datos | Piloto |
| Diagnóstico, calidad, recuperación | Estable; informa y permite revisión, no prueba conservación del backup | Diagnóstico / Calidad |
| Centro de ayuda y documentación integrada | Estable; contenido local versionado por perfil | Ayuda |
| Cuentas online, sincronización, tickets y cooperación automática | Pendiente de backend futuro; no implementado | Sin ruta ni promesa de disponibilidad |

Los límites concretos y la recomendación de uso están en [KNOWN-ISSUES](KNOWN-ISSUES.md) y [AUDITORIA-V2](AUDITORIA-V2.md).
