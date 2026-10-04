# Asistente Bibliotecario

Biblioteca escolar en español de Argentina, pensada para el celular. Sitio estático, sin cuentas ni servicios pagos propios.

## Alta de libros

1. **Agregar libro → Escanear con cámara** o ingresar ISBN-10/ISBN-13 (también admite lectores externos).
2. Consulta simultánea a Google Books y Open Library, con un máximo de 10 segundos por fuente. Google se acepta solo si sus identificadores coinciden con la edición solicitada; ISBN-10 y su equivalente ISBN-13 se consideran iguales.
3. Previsualización de título, subtítulo, autores, editorial, año, páginas, idioma, temas y portada cuando las fuentes los proporcionan. Se informa origen por campo, diferencias entre fuentes, ausencia de coincidencia y fallas de servicio. Google tiene prioridad y Open Library completa los faltantes; los temas se combinan. Las diferencias se muestran para revisión humana, no se consideran verificadas automáticamente.
4. **Confirmar libro → cantidad de ejemplares, ubicación y estado → Guardar libro.** La ficha bibliográfica queda autocompletada y se puede corregir. Los campos faltantes pueden completarse después; el título es obligatorio.
5. Si el ISBN ya existe, se ofrece editar esa ficha para sumar ejemplares. La carga manual queda como alternativa para libros sin ISBN o sin coincidencias.

La cámara usa BarcodeDetector con EAN-13 cuando el navegador lo admite y requiere HTTPS y permiso. Si no está disponible, el ISBN se puede ingresar a mano. Las imágenes de cámara se procesan en el dispositivo, sin guardarlas ni subirlas. Se libera la cámara al cerrar, cancelar, cambiar de pestaña o detectar un ISBN. **La lectura con una cámara física aún requiere prueba en el teléfono objetivo**; las pruebas automatizadas verifican el flujo y la liberación de recursos con un dispositivo simulado.

Las APIs externas pueden tener registros incompletos, errores, restricciones o límites de uso. No se incluyen claves privadas. La aplicación puede guardar y buscar datos locales aunque falle la consulta externa, siempre que ya esté abierta; todavía no implementa caché offline de la aplicación.

## Buscar, guardar y respaldar

Búsqueda por título, subtítulo, autores, ISBN, editorial, ubicación, categoría, temas y cuentos/capítulos. Normaliza acentos, puntuación, variantes de Primera/Segunda Guerra Mundial y murciélago/murciélagos; omite algunas palabras de enlace. Es una búsqueda del contenido registrado, no una IA que adivine argumentos de libros desconocidos.

El catálogo se guarda en IndexedDB **en ese navegador y dispositivo**. No hay sincronización entre celulares y computadoras. Borrar datos del sitio puede borrar el catálogo: exportar respaldos regularmente. Los respaldos nuevos son versión 2 y conservan autores, portada, fuentes y ejemplares; también se importan los anteriores de versión 1. Importar solicita confirmación y actualiza las fichas con el mismo identificador, conservando las demás. La migración del catálogo anterior se realiza en una transacción.

## Estructura preparada para fotos e IA

- `src/isbn.js`: validación y equivalencia de ISBN.
- `src/metadata.js`: adaptadores de fuentes externas, combinación y procedencia.
- `src/scanner.js`: lectura y ciclo de vida de cámara.
- `src/catalog.js`: validación, búsqueda, esquema y respaldos.
- `src/storage.js`: persistencia atómica.
- `src/app.js`: experiencia de consulta, revisión y guardado.

Cada registro mantiene los campos anteriores para compatibilidad y agrega `schemaVersion: 2`, `workId`, `editionId`, autores, metadatos editoriales, `exemplars` con identificadores estables, ubicación y estado, y contenidos educativos separados de las notas. La interfaz aplica ubicación y estado al grupo de ejemplares; el préstamo y la edición individual de cada ejemplar quedan pendientes. El identificador de obra prepara futuras relaciones entre ediciones; todavía no agrupa automáticamente obras similares.

`enrichment` reserva versión, estado, referencias de adjuntos y propuestas para una futura incorporación de fotos de tapa/índice y OCR/IA. **No hay extracción con IA ni carga de fotos implementada aún.** Las fotos futuras deberán guardarse en un almacén separado, ampliar el respaldo y requerir confirmación humana antes de aplicar propuestas. Cualquier clave privada de IA deberá permanecer en un servidor.

## Desarrollo y pruebas

Requiere Node.js 20+ (recomendado 22+). No necesita instalar dependencias para ejecutar el sitio.

```sh
node scripts/serve.mjs
node --test tests/*.test.js
node tests/browser.cjs
node tests/isbn-browser.cjs
```

Servidor: http://127.0.0.1:4173. Las pruebas de navegador usan Playwright y Edge; `PLAYWRIGHT_MODULE` permite señalar un módulo instalado. `tests/browser.cjs` también acepta `BROWSER_CHANNEL`. Las consultas externas se simulan en las pruebas deterministas. Cubren persistencia, búsqueda, edición, eliminación, respaldos, caracteres HTML, alta por ISBN, duplicados, cancelación, fallas de API, cámara simulada y pantallas de 320/390/740/1440 px. Capturas y datos aislados en `qa/`, excluidos de Git.

## Publicación

GitHub Pages: rama `main`, raíz `/`. Todos los recursos tienen rutas relativas; `.nojekyll` permite servir los módulos directamente. URL del proyecto: https://sanlean.com.ar/AsistenteBibliotecario/ (hereda el dominio del sitio de cuenta SanLean17.github.io).

**Este repositorio no debe copiar el CNAME `sanlean.com.ar` del sitio principal:** reasignaría el dominio. Se usa la ruta del proyecto, sin cambiar DNS ni archivos del otro repositorio. Un subdominio dedicado requeriría DNS y validación propios. Los datos locales de localhost y del sitio publicado son independientes; exportar/importar para trasladarlos.

Documentación de las integraciones: [Google Books](https://developers.google.com/books/docs/v1/using), [Open Library](https://openlibrary.org/dev/docs/api/books).
