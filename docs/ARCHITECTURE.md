# Arquitectura y dirección del prototipo

## Dos experiencias, una identidad

`index.html` es la landing pública. Explica el producto, ofrece recursos y distingue capacidades disponibles de desarrollos futuros. No abre IndexedDB ni muestra cifras de una institución. `app.html` contiene el espacio interno local: panel con buscador, catálogo, incorporación, ejemplares y configuración. Los enlaces antiguos `/#biblioteca`, `/#ficha/...`, etc. se redirigen conservando su destino. IndexedDB conserva el mismo nombre y versión, en el mismo origen: cambiar de página no cambia ni borra el catálogo.

El nombre Asistente Bibliotecario sigue siendo provisional. La identidad editorial usa serif/display para titulares y fichas, sans para controles, grillas finas, fondos claros y la paleta azul/celeste pedida. Los temas comparten `theme.css` y la preferencia `ab-theme`. No se agregan cuentas ficticias ni botones de préstamos sin función.

## Capas

1. Presentación: landing y aplicación, independientes.
2. Casos de uso: consulta bibliográfica, validación de edición, inventario físico, fotos, búsqueda, respaldos.
3. Proveedores: `providers/registry.js`, adaptadores HTTPS en `browser.js`, normalizadores en `records.js`; BN en `server/bn-provider.mjs` y transformador MARC en `providers/marc.js`.
4. Almacenamiento: contrato `createRepository(adapter)` en `storage.js`; implementación local en `storage/indexeddb.js`. La UI consume el contrato, no transacciones IndexedDB directamente.
5. Dominio: obra, edición y ejemplares con identidad estable; `domain.js` ofrece la proyección normalizada y los estados previstos. La persistencia local sigue empaquetada por registro para no arriesgar migraciones innecesarias.

Las fuentes HTTPS se consultan en paralelo. Open Library precede a Google Books para el valor visible si hay conflictos; esto es una política explícita de combinación, no una garantía de autoridad. Se unen autores, temas y contenidos; las discrepancias y los registros de origen se conservan. ISBN-10 e ISBN-13 se tratan como la misma edición. Un futuro proveedor puede inyectarse en `lookupISBN({providers})` sin reescribir el formulario. La BN solo puede ejecutarse desde un entorno de servidor.

## Modelo preparado para varias instituciones

Institución → Biblioteca → Colección → Ejemplar → Edición → Obra.

- Obra: título intelectual, autoría, temas y contenidos; una traducción necesita decisión catalográfica explícita.
- Edición: ISBN y variantes, editorial, fecha, idioma, edición, páginas, clasificación e identificadores de fuente.
- Ejemplar: ID estable, referencia a edición, institución/biblioteca/colección, código de inventario, ubicación, estado físico y foto propia.
- Las fotografías se almacenan aparte de las fichas. Eliminar la última copia conserva la ficha bibliográfica con cero ejemplares. Eliminar una ficha elimina todas sus copias y fotos en una transacción.

Los identificadores `local-*` describen el ámbito del prototipo y no son identidades autenticadas. En una base compartida, el servidor debe resolver instituciones y permisos desde sesiones verificadas, deduplicar ediciones por ISBN canónico y conservar IDs de origen. Nunca deduplicar obras por título solamente ni usar los IDs locales como autorización.

## Roadmap modular

| Módulo | Actualmente | Próximo alcance |
|---|---|---|
| Catalogación / copia | ISBN, campos de edición, fuentes, contenidos | BN, MARC import/export y autoridades controladas |
| OPAC y docentes | Búsqueda de metadatos, sinónimos y contenidos | Perfil docente, filtros por audiencia documentada, semántica |
| Ejemplares | Inventario, ubicación, condición física, fotos | Etiquetas/códigos, colecciones y bajas auditables |
| Circulación | Estado `untracked`; no se afirma disponibilidad real | Disponible, prestado, reservado, vencido, extraviado, baja |
| Reservas | Modelo de estados previsto | Solicitud → aprobación → preparación → retiro; cancelación/vencimiento |
| Préstamos | No activos | Usuario, ejemplar, fecha de salida, vencimiento, devolución, renovaciones |
| Usuarios / institución | Ámbito local sin cuentas | Bibliotecario/admin/docente/alumno, permisos, políticas institucionales |
| Estadísticas | Contadores locales del catálogo | Estadísticas de uso y circulación, privacidad y exportación |
| Índices | Datos externos y carga manual opcional | Foto → OCR/IA → propuestas → confirmación humana |
| Red escolar | Sin sincronización | Catálogo de ediciones compartido y préstamos entre escuelas con permisos |

`Deteriorado` es condición física, no un estado de préstamo. Una copia puede estar deteriorada y prestada a la vez. `overdue` se calcula por fecha de vencimiento y ausencia de devolución; no se necesita un cambio manual diario. Las futuras operaciones de circulación deben ser transaccionales, con un préstamo activo máximo por copia y reserva sujeta a la política de la institución.

La búsqueda actual no promete comprensión semántica: ignora palabras funcionales, normaliza algunos sinónimos y requiere que los conceptos estén indexados. Un pedido “San Martín para quinto grado” solo encuentra grado/edad si está documentado en descripción, audiencia o temas. No inventa recomendaciones pedagógicas.

## Límites de esta etapa

Sin Supabase, login real, contratación ni infraestructura paga. No hay servidor en GitHub Pages. No se afirma que reservas, disponibilidad de préstamos, OCR o IA estén activos. El respaldo JSON sigue siendo la vía de traslado entre navegadores. La estructura permite agregar un repositorio remoto sin acoplarlo a la presentación, pero su autorización y sincronización deben implementarse antes de ofrecer múltiples instituciones.
