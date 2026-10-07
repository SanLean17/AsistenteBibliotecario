# Arquitectura y dirección del prototipo

## Dos experiencias, una identidad

`index.html` es la landing pública. Explica el producto, ofrece recursos y distingue capacidades disponibles de desarrollos futuros. No abre IndexedDB ni muestra cifras de una institución. `app.html` contiene el espacio interno local: panel con buscador, catálogo, incorporación, ejemplares y configuración. Los enlaces antiguos `/#biblioteca`, `/#ficha/...`, etc. se redirigen conservando su destino. IndexedDB conserva el nombre y migra sus stores a la versión 4, en el mismo origen: cambiar de página no cambia ni borra el catálogo.

El nombre Asistente Bibliotecario sigue siendo provisional. La identidad editorial usa serif/display para titulares y fichas, sans para controles, grillas finas, fondos claros y la paleta azul/celeste pedida. Los temas comparten `theme.css` y la preferencia `ab-theme`. No se agregan cuentas ficticias ni botones de préstamos sin función.

## Capas

1. Presentación: landing y aplicación, independientes.
2. Casos de uso: consulta bibliográfica, validación de edición, inventario físico, fotos, búsqueda, respaldos.
3. Proveedores: `providers/registry.js`, adaptadores HTTPS en `browser.js`, normalizadores en `records.js`; BN en `server/bn-provider.mjs` y transformador MARC en `providers/marc.js`.
4. Almacenamiento: contrato `createRepository(adapter)` en `storage.js`; implementación local en `storage/indexeddb.js`. La UI consume el contrato, no transacciones IndexedDB directamente.
5. Dominio: obra, edición y ejemplares con identidad estable; `domain.js` ofrece la proyección normalizada y los estados previstos. La persistencia mantiene books compatible y proyecciones normalizadas de obra, edición y ámbito institucional.

Las fuentes HTTPS se consultan en paralelo. Open Library precede a Google Books para el valor visible si hay conflictos; esto es una política explícita de combinación, no una garantía de autoridad. Se unen autores, temas y contenidos; las discrepancias y los registros de origen se conservan. ISBN-10 e ISBN-13 se tratan como la misma edición. Un futuro proveedor puede inyectarse en `lookupISBN({providers})` sin reescribir el formulario. La BN solo puede ejecutarse desde un entorno de servidor.

## Modelo preparado para varias instituciones

Institución → Biblioteca → Colección/Sector → Obra → Edición → Ejemplar.

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
| Ejemplares | Código estable, etiquetas, ubicación estructurada, condición, fotos y auditoría | Políticas por institución |
| Circulación | Disponible, prestado, reservado, vencido, extraviado, baja; operaciones atómicas locales | Sincronización institucional |
| Reservas | Solicitud → aprobación → preparación → retiro; cancelación/vencimiento | Notificaciones |
| Préstamos | Usuario, ejemplar, salida, vencimiento y devolución | Renovaciones y políticas institucionales |
| Usuarios / institución | Perfiles locales y permisos temporales sin contraseña | Autenticación y autorización en servidor |
| Estadísticas | Contadores locales del catálogo | Estadísticas de uso y circulación, privacidad y exportación |
| Índices | Datos externos y carga manual opcional | Foto → OCR/IA → propuestas → confirmación humana |
| Red escolar | Sin sincronización | Catálogo de ediciones compartido y préstamos entre escuelas con permisos |

`Deteriorado` es condición física, no un estado de préstamo. Una copia puede estar deteriorada y prestada a la vez. `overdue` se calcula por fecha de vencimiento y ausencia de devolución; no se necesita un cambio manual diario. Las operaciones de circulación son transaccionales, con un préstamo activo máximo por copia y reserva sujeta a la política de la institución.

La búsqueda actual no promete comprensión semántica: ignora palabras funcionales, normaliza algunos sinónimos y requiere que los conceptos estén indexados. Un pedido “San Martín para quinto grado” solo encuentra grado/edad si está documentado en descripción, audiencia o temas. No inventa recomendaciones pedagógicas.

## Límites de esta etapa

Sin Supabase, login real, contratación ni infraestructura paga. No hay servidor en GitHub Pages. Préstamos y reservas funcionan localmente. OCR e IA no están activos. El respaldo JSON sigue siendo la vía de traslado entre navegadores. La estructura permite agregar un repositorio remoto sin acoplarlo a la presentación, pero su autorización y sincronización deben implementarse antes de ofrecer múltiples instituciones.

## Descubrimiento docente en la escuela registrada

La portada prioriza un buscador de libros y cuentos por palabras o frases. Debajo se reserva un espacio de descubrimiento, hoy explícitamente marcado como futuro, con tres módulos:

- **Más reservados por docentes**: ranking de ediciones de la propia escuela a partir de reservas reales, con período visible; excluir canceladas y pruebas y evitar contar varias veces la misma solicitud. Sin historial suficiente, mostrar un estado vacío; nunca reemplazarlo por cifras inventadas.
- **Cuentos destacados**: selección de bibliotecarios y recomendaciones docentes aprobadas, vinculadas a una edición o a un cuento de su índice. Mostrar motivo y procedencia.
- **Ideas por grado y proyecto**: experiencias aportadas por docentes con grado, área/tema, trabajo realizado y comentario. Son experiencias documentadas, no una inferencia automática de adecuación pedagógica.

Antes de activarlos hacen falta cuentas institucionales, autorización por escuela, circulación/reservas persistentes y moderación de recomendaciones. La agregación debe quedar dentro de la institución; no publicar nombres de docentes ni su historial individual en el ranking. El prototipo guarda reservas reales en ese navegador; todavía no publica rankings. La interfaz y el roadmap ya muestran esta dirección.

## Entrega local de circulación y permisos — 2026-10-05

La versión actual migra IndexedDB de v1/v2/v3 a v4, preservando stores, IDs y datos. Agrega grants, settings y proyecciones institutions/libraries/collections/works/editions. La cadena es Institución → Biblioteca → Colección/Sector → Obra → Edición → Ejemplar. `books` mantiene una proyección de lectura compatible; cada edición tiene un único conjunto de metadatos, no uno por ejemplar. La vinculación de obras es explícita desde el editor, nunca automática por título. Las ediciones vinculadas comparten contenido intelectual; conservan ISBN, editorial y ejemplares propios.

- `permissions.js`: roles base, habilitación y concesiones temporales adicionales. Revocar rol no elimina concesiones vigentes; deshabilitar persona anula ambos. Cada concesión conserva autor, intervalo, nota y revocación. La fecha de vencimiento en la UI incluye todo el día local.
- `local-domain.js`: operaciones validadas y auditoría. `storage/indexeddb.js` lee, valida y escribe el estado relacionado en una única transacción readwrite. Las pestañas concurrentes no pueden prestar la misma copia dos veces. La implementación local privilegia atomicidad frente a rendimiento; lee los stores y los reescribe en cada mutación. Para catálogos grandes deberá evolucionar a escrituras por entidad y transacciones acotadas, manteniendo las mismas reglas.
- Código `internalCode` AB monotónico e inmutable; inventario de origen independiente. No se recicla la secuencia al borrar. Los QR y Code128 contienen este código. Se generan con librerías MIT incluidas en vendor, sin llamadas externas. La lectura usa ZXing local, cámara/foto o lector USB.
- Sector/estantería/estante se guardan en physicalLocation. location conserva compatibilidad con texto libre. Las colecciones locales se derivan de los sectores.
- Circulación: disponible/reservado/prestado/vencido derivado de operaciones; extraviado/baja son bloqueos del ejemplar; deteriorado conserva la dimensión física y bloquea nuevos préstamos hasta revisarlo. Un préstamo puede estar vencido aunque la copia tenga una condición física regular.
- Reservas: solicitada → aprobada con copia asignada → lista → retirada al crear préstamo, o cancelada/vencida. No se permite asignar una copia ya prestada o reservada. Vencimientos se concilian al abrir y refrescar pantallas.
- Historial persistente de materiales, ejemplares, permisos, usuarios, préstamos, devoluciones, reservas e importaciones. Borrar un libro no borra circulación histórica. Préstamos o reservas activos impiden eliminar/bajar/vaciar hasta resolverlos.
- JSON v4 completo: catálogo, fotos, personas, permisos, circulación, configuración, auditoría y proyecciones. Restaurar v4 reemplaza el estado tras confirmación y validación; el contador interno nunca retrocede. JSON v1–v3 sigue combinando catálogo/fotos. No se restauran estados con referencias activas rotas o préstamos duplicados.

Los perfiles son seleccionables en el menú **sin contraseña**. Este RBAC es una regla del prototipo, no una frontera de seguridad contra quien controla el navegador. La auditoría es local y editable desde herramientas del dispositivo. Autenticación, control de acceso en servidor, protección de datos multiinstitucional y sincronización siguen pendientes. No se crea infraestructura externa.

### Interoperabilidad

`imports.js` expone ImportProvider, AguapeyMarcProvider y JsonBackupProvider. El lector ISO 2709 valida offsets y longitudes en bytes UTF-8, rechaza truncamiento/codificación no compatible y conserva los campos fuente. Para archivos MARC-8 se requiere conversión explícita a UTF-8; no se interpreta arbitrariamente como Windows-1252. No se inventan ejemplares cuando el archivo no incluye holdings.

El mapeo local 859 (inventario, parte/volumen, procedencia, estado, ubicación, clasificación, librística) y 852 institucional sigue el [manual oficial de Aguapey](https://www.bnm.me.gov.ar/giga1/libros/manual-aguapey-bera.pdf). El fallback estándar 852 usa $p identificación, $b sububicación, $c ubicación, $h clasificación y $i librística según [MARC21](https://www.loc.gov/marc/bibliographic/bd852.html). La prueba usa fixtures sintéticos, no un archivo real de una escuela. Se requiere validación con ese archivo antes de afirmar compatibilidad universal o habilitar Marc21ExportProvider. Fuentes remotas ISBN conservan sus providers y no se agrega scraping.

## Decisión de producto cerrada: reconocer antes de preguntar (2026-10-06)

La incorporación parte de **Abrir cámara → escanear → detectar identificador → recuperar información disponible → revisar → completar solamente lo que falta**. No hay selector previo de tipo de material o identificador. Después de un intento fallido o de no poder usar la cámara se ofrecen Intentar nuevamente, Ingresar un código e Incorporar manualmente. La fotografía de un código es una alternativa de lectura, no OCR.

El reconocimiento local distingue ISBN, ISSN, DOI, URL y códigos internos AB. Un QR es un soporte del dato: se clasifica su contenido. Nunca se abre ni consulta una URL arbitraria automáticamente. Los proveedores bibliográficos actuales recuperan por ISBN; los demás identificadores se conservan para revisión, sin fabricar metadatos. Futuros resolvers por identificador deberán declarar disponibilidad, procedencia y campos sugeridos, y tolerar ausencia de resultados.

El modelo contempla libros, revistas, diarios/periódicos, artículos, documentos, producciones escolares, recursos digitales y otros. Tipo de material se confirma en la revisión, no antes del reconocimiento. Todo material admite subjects (palabras clave/temas), description y contents; ninguno requiere ISBN, autor, editorial o páginas. Los recursos sin copia física pueden tener cero ejemplares. Una entrada de contents no crea un ejemplar ni una obra independiente.

Diarios: publication, publicationDate, edition, issn, subjects, description y contents describen la publicación y sus titulares, artículos, suplementos o secciones. Las copias conservan ubicación, estado, disponibilidad derivada y código interno AB. El buscador consulta esos datos junto con los temas de todos los tipos: un diario sobre Segunda Guerra Mundial puede aparecer junto con un libro sobre el mismo tema. Hoy devuelve el material contenedor; un resultado diferenciado de contenido interno es una evolución futura.

**El sistema se adapta al material. El material no debe adaptarse al formulario.**

### Asistencia por fotografía: futura, no implementada

Fotografiar tapa/portada/primera plana podrá proponer titulares, nombres, fechas, temas, palabras clave, contenidos y un resumen inicial. El contrato futuro debe conservar foto de origen, propuestas por campo, procedencia y decisión humana (aceptada/rechazada/editada). No debe escribir el catálogo ni crear ejemplares al terminar el reconocimiento. **La automatización propone. La persona confirma.** No se anuncia como disponible ni se contratan servicios en esta etapa.

## Instituciones, personas y acceso local (2026-10-06)

La versión 5 de IndexedDB migra el catálogo existente sin cambiar identificadores de materiales, ejemplares, fotos, préstamos ni eventos. `people` representa a la persona; `memberships` conserva cargo, perfil, estado y vigencia en cada institución. `grants` pertenece siempre a una institución y una persona. Cargo, perfil y permisos adicionales no son equivalentes. Las invitaciones quedan pendientes hasta una validación local explícita.

`access-model.js` proyecta el contexto institucional y vuelve a combinarlo dentro de una única transacción de IndexedDB. Catálogo, circulación, permisos, configuración, auditoría e inventario quedan separados por institución. Los identificadores en conflicto con otra institución se rechazan. La administración principal se guarda en la institución, nunca como cargo. Puede transferirse mediante confirmación del nombre; desactivar la institución retiene historial y retira las vinculaciones. Exportaciones completas y vaciado masivo requieren esa responsabilidad y no son permisos adicionales delegables.

`permissions.js` define perfiles y permisos con nombres legibles. `access-domain.js` valida cambios, invitaciones, permisos y responsabilidades; `access-ui.js` proporciona registro, onboarding, pantallas diferenciadas y gestión de accesos usando los componentes visuales existentes. La biblioteca puede delegar tareas operativas, pero no convertir a otra persona en autoridad ni delegar administración máxima. Nadie modifica su propio cargo/perfil ni se otorga permisos. La autoridad principal debe asignar nuevos perfiles de Autoridad Institucional.

Las fechas se capturan con hora local y se persisten como instantes ISO. La autorización consulta la vigencia en cada operación. Se registra un único evento de vencimiento al abrir la aplicación, operar o revisar el contexto periódicamente (30 segundos cuando está visible). No hay tareas ejecutándose con el navegador cerrado. Al finalizar una suplencia se inactiva la vinculación; al terminar una suspensión se reactiva. Las personas y las referencias históricas permanecen.

Las renovaciones propias requieren política habilitada, préstamo vigente, ningún atraso, ninguna reserva de otra persona y no haber usado la renovación permitida. El personal institucional solo recibe préstamos si se habilita esa política. Temas/contenidos y alta de ejemplares tienen operaciones específicas para que un permiso granular no requiera editar toda la ficha.

### Límites explícitos del prototipo

No se creó Supabase, Firebase, backend, cuenta externa ni dependencia paga. Registrar una institución crea un espacio únicamente en el navegador actual. El selector de persona simula la identidad y no es autenticación ni una barrera de seguridad ante alguien con acceso al dispositivo o sus herramientas de desarrollo. Los correos son datos de contacto: no se envían invitaciones reales. No existe sincronización ni recuperación desde un servidor. Las recomendaciones y novedades personalizadas siguen siendo futuras.

Los respaldos completos versión 5 contienen la institución actual y sus personas vinculadas, sin exportar otros espacios. Se validan antes de restaurar. Para reemplazar un espacio existente se debe seleccionar esa institución; si todavía no existe en el navegador, se recupera como un espacio separado, conservando las demás instituciones. Los respaldos versión 4 siguen siendo compatibles; los anteriores conservan la incorporación de catálogo y fotos. La capa de persistencia puede reemplazarse por un repositorio remoto; en esa etapa la identidad, autorización, auditoría y vencimientos deberán verificarse en el servidor, y las identidades locales tendrán que vincularse a cuentas verificadas.

### Archivos de esta entrega

- `src/access-model.js`, `src/access-domain.js`, `src/access-ui.js`: modelo, reglas y experiencia institucional.
- `src/permissions.js`, `src/local-domain.js`, `src/storage/indexeddb.js`: perfiles, circulación, migración y separación de datos.
- `src/app.js`, `src/local-ui.js`, `app.html`, `index.html`: integración, selector institucional y CTA de registro.
- `src/catalog.js`, `src/imports.js`: respaldos versión 5 y compatibilidad.
- Pruebas de acceso, perfiles, migración, circulación, incorporación y responsive en `tests/`.

Los demás módulos de fuentes, escaneo, circulación y etiquetas solo actualizan la versión compartida de sus importaciones (`20261006-3`) para evitar mezclar código viejo y nuevo en caché. Las hojas de estilo no se modificaron.

### Verificación de esta entrega

38 pruebas de lógica aprobadas. Pruebas de navegador aprobadas: registro y onboarding completos; invitaciones, perfiles y aislamiento institucional; recuperación de respaldo en un navegador nuevo; los cinco paneles de acceso; restricciones de autoasignación; préstamos, reservas, renovación y materiales guardados; migraciones v1/v3; escaneo/ISBN/QR, fotos y MARC; navegación y estados claro/oscuro. Responsive comprobado a 320, 390, 768 y 1440 px (también 1280 en gestión de personas). Se ejecutaron Chromium/Chrome y WebKit con emulación iPhone; no equivale a una prueba física de cámara en todos los modelos de teléfono.

## Landing pública editorial (2026-10-07)

La experiencia pública utiliza `index.html`, `landing.css` y `src/landing.js`; no importa el almacenamiento ni la aplicación interna. Conserva las fuentes Inter/Lora y los colores de `theme.css`. Las referencias Corndel/Oodi se interpretan por comportamiento y composición: cabecera flotante, menú con fondo desenfocado, imágenes amplias y bloques narrativos alternados. No se incorporan sus marcas, textos, fotografías o estilos tipográficos.

El orden ahora es: hero con captura del producto; mosaico de cuatro etapas; narrativa de incorporación y búsqueda; manifiesto; funcionalidades seleccionables; comunidad escolar; vista móvil; cifras de demostración; preguntas frecuentes; CTA final y footer en cinco columnas. Los enlaces internos se desplazan suavemente y dejan libre la cabecera. La navegación tiene cierre con Escape, devolución del foco, fondo inerte y cierre al cambiar de tamaño. Las capturas pueden ampliarse en un diálogo. La preferencia de movimiento reducido desactiva transiciones, aparición y conteos animados.

`assets/product/` contiene capturas reales de la aplicación con un escenario ficticio: una institución, ocho materiales, doce ejemplares y tres operaciones de circulación. Los valores están descritos en `demo.json` y señalados explícitamente en la página; no son métricas de usuarios reales. `scripts/capture-product.cjs` reproduce las capturas en un contexto nuevo y aislado de Playwright, con ilustraciones locales interceptadas como fixtures. Nunca incorpora estos datos al navegador del usuario. No se hicieron cambios al dominio, CNAME ni publicación de Pages.

### Orientación de la plataforma interna

La estructura pública explica dos experiencias internas, sobre las rutas y autorizaciones existentes:

- Docentes/lectores: una pregunta y un buscador como entrada, seguidos de accesos a sus préstamos (`#circulacion`), reservas (`#reservas`), temas (`#temas`) y catálogo (`#biblioteca`). La futura selección de materiales nuevos debe usar fechas documentadas, no recomendaciones inventadas.
- Biblioteca: búsqueda, incorporación (`#agregar`), circulación, ejemplares (`#inventario`) y personas (`#usuarios`), más el resumen real de la biblioteca.
- Autoridades: institución, personas, accesos, actividad y configuración; las funciones operativas se muestran según sus permisos, sin concederlos por el diseño.

Esta iteración no modifica formularios, permisos, almacenamiento ni circulación. La distinción entre cargo y acceso, la incorporación con cámara primero y la revisión humana de metadatos siguen vigentes.
