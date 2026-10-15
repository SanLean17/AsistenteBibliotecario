# Centro de ayuda, capacitación y soporte contextual V1

La ruta `#ayuda` muestra guías según el perfil activo. Está disponible desde el menú y el signo de ayuda de la cabecera. La búsqueda se realiza en memoria, sin guardar consultas ni enviarlas a servicios externos. Los artículos administrativos se filtran también al abrir una dirección directa. Los enlaces a operaciones respetan los permisos vigentes.

## Uso

Buscá una duda (por ejemplo, «devolver libro», «copias», «código AB» o «no me anda cámara»), abrí un resultado y seguí su explicación. Las categorías se despliegan a pedido. Glosario explica los términos; Documentación integrada contiene las guías completas del repositorio. Imprimir esta guía abre la impresión del navegador con un diseño sin menús ni controles.

Biblioteca tiene cinco niveles: primeros pasos, circulación, catalogación, inventario/calidad y migración/cooperación. Docentes tienen búsqueda/reservas, Mi biblioteca y proyectos. Autoridad tiene organización, permisos y analítica. Lectores cuentan con búsqueda, disponibilidad y operaciones propias. Son orientaciones, no evaluaciones; no hay puntos ni insignias.

## Ayuda durante la tarea

Jornada, Inventario, Calidad, Migración, Red Escolar, Hemeroteca, Analítica, Organización, Configuración/backup, OCR, carga y Proyectos incluyen «¿Qué es esto? · Ayuda». Es un bloque desplegable en el flujo de la página: se cierra sin tapar controles ni perder datos del formulario.

«Mostrarme cómo» abre una ruta real y un recorrido opcional de tres o cuatro pasos. Anterior/Siguiente cambian únicamente el texto. Terminar no afirma que se completó una operación. Cerrar, recargar o cambiar de persona/institución descarta el recorrido. La navegación no guarda materiales ni ejecuta operaciones por cuenta de la persona.

Las listas para migración e inventario son recordatorios manuales temporales, no comprobantes. Inventario muestra además el número real de sesiones abiertas de la institución. Las operaciones, conflictos, zonas y cierres se revisan en sus pantallas existentes. No se inventa evidencia de respaldo guardado ni se duplica la lógica de importación.

## Documentos y mantenimiento

`src/help-content.js` define artículos, visibilidad, términos alternativos, glosario, recorridos y relaciones. `scripts/build-help.mjs` genera bloques estructurados desde GUIA-BIBLIOTECA, GUIA-DOCENTE, GUIA-AUTORIDAD, MIGRACION, RED-ESCOLAR, HEMEROTECA, ANALITICA-BIBLIOTECA, ADMINISTRACION-INSTITUCIONAL, INGRESO-Y-ACCESO, PRIVACIDAD-PILOTO y RELEASE_NOTES.md. Los documentos siguen siendo la fuente de las guías extensas.

La generación admite solo archivos locales enumerados. Convierte Markdown a texto con encabezados y elementos; no ejecuta HTML, scripts ni enlaces de documentos. El render escapa todo texto. Los archivos generados quedan en el manifiesto offline y no necesitan consultar GitHub. El contenido corresponde a la versión de la app; las notas históricas conservan su versión original.

Después de editar documentos: `node scripts/build-help.mjs`, luego `node scripts/build-offline.mjs`. `npm run check` rechaza documentos desactualizados, artículos relacionados inexistentes, rutas ausentes y versiones inconsistentes. `npm test` incluye búsqueda, roles, glosario y transiciones de recorrido; `npm run test:help-browser` prueba integración, permisos, impresión, paneles, responsive y tema oscuro.

## Soporte y privacidad

La ayuda enlaza al diagnóstico existente y ofrece su exportación a quienes tienen `sensitive.export`, sin crear otro sistema. El resumen contiene versión, cantidades y resultado de integridad, no nombres ni fichas. Las observaciones se registran en el piloto existente y no se envían. Un reporte manual debe describir pasos y resultado, sin datos personales ni respaldo completo.

No hay chat, tickets, IA, telemetría ni cuentas online. Tampoco se guarda historial de búsqueda ni progreso de lectura. La ayuda no modifica el catálogo, préstamos ni permisos. Cámara, lector USB e impresión física necesitan validación en los equipos reales; las pruebas automatizadas no certifican esos dispositivos.
