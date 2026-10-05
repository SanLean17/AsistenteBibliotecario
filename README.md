# Asistente Bibliotecario

Biblioteca escolar en español de Argentina, pensada para el celular. Sitio estático, sin cuentas ni servicios pagos propios.

## Alta de libros

1. **Agregar libro → Escanear con cámara** o ingresar ISBN-10/ISBN-13 (también admite lectores externos).
2. Consulta simultánea a Google Books y Open Library, con un máximo de 10 segundos por fuente. Google se acepta solo si sus identificadores coinciden con la edición solicitada; ISBN-10 y su equivalente ISBN-13 se consideran iguales.
3. Previsualización de título, subtítulo, autores, editorial, año, páginas, idioma, temas y portada cuando las fuentes los proporcionan. Se informa origen por campo, diferencias entre fuentes, ausencia de coincidencia y fallas de servicio. Google tiene prioridad y Open Library completa los faltantes; los temas se combinan. Las diferencias se muestran para revisión humana, no se consideran verificadas automáticamente.
4. **Confirmar libro → cantidad de ejemplares, ubicación y estado → Guardar libro.** La ficha bibliográfica queda autocompletada y se puede corregir. Los campos faltantes pueden completarse después; el título es obligatorio.
5. Si el ISBN ya existe, se ofrece editar esa ficha para sumar ejemplares. La carga manual queda como alternativa para libros sin ISBN o sin coincidencias.

La cámara requiere HTTPS y permiso. Usa BarcodeDetector cuando está disponible y ZXing 0.2.1, servido desde este mismo sitio, como alternativa para navegadores sin ese lector (incluido Chrome en iPhone). La solicitud de cámara se hace al tocar el botón, antes de cargar el decodificador. El ISBN también se puede ingresar a mano, con o sin guiones/espacios. Las imágenes de cámara se procesan en el dispositivo, sin guardarlas ni subirlas. Se libera la cámara al cerrar, cancelar, cambiar de pestaña o detectar un ISBN. **La lectura con una cámara física aún requiere prueba en el teléfono objetivo**; las pruebas automatizadas verifican el flujo, la liberación de recursos y la decodificación real de EAN-13 desde un video generado, sin BarcodeDetector. No reemplazan una prueba óptica con el iPhone físico.

Las APIs externas pueden tener registros incompletos, errores, restricciones o límites de uso. No se incluyen claves privadas. La aplicación puede guardar y buscar datos locales aunque falle la consulta externa, siempre que ya esté abierta; todavía no implementa caché offline de la aplicación.

## Buscar, guardar y respaldar

Búsqueda por título, subtítulo, autores, ISBN, editorial, ubicación, categoría, temas y cuentos/capítulos. Normaliza acentos, puntuación, variantes de Primera/Segunda Guerra Mundial y murciélago/murciélagos; omite algunas palabras de enlace. Es una búsqueda del contenido registrado, no una IA que adivine argumentos de libros desconocidos.

El catálogo se guarda en IndexedDB **en ese navegador y dispositivo**. No hay sincronización entre celulares y computadoras. Borrar datos del sitio puede borrar el catálogo: exportar respaldos regularmente. Los respaldos nuevos son versión 3 y conservan autores, portada, fuentes, ejemplares y fotos físicas; también se importan los anteriores de versiones 1 y 2. Se validan las fotos JPEG y su vínculo al ejemplar antes de importar. El límite de importación es 50 MB. Importar solicita confirmación y actualiza las fichas con el mismo identificador, conservando las demás. La migración del catálogo anterior se realiza en una transacción.

## Estructura preparada para fotos e IA

- `src/isbn.js`: validación y equivalencia de ISBN.
- `src/metadata.js`: adaptadores de fuentes externas, combinación y procedencia.
- `src/scanner.js`: lectura y ciclo de vida de cámara.
- `src/catalog.js`: validación, búsqueda, esquema y respaldos.
- `src/storage.js`: persistencia atómica.
- `src/app.js`: experiencia de consulta, revisión y guardado.

Cada registro mantiene los campos anteriores para compatibilidad y agrega `schemaVersion: 2`, `workId`, `editionId`, autores, metadatos editoriales, `exemplars` con identificadores estables, ubicación y estado, y contenidos educativos separados de las notas. La interfaz aplica ubicación y estado al grupo de ejemplares; el préstamo y la edición individual de cada ejemplar quedan pendientes. El identificador de obra prepara futuras relaciones entre ediciones; todavía no agrupa automáticamente obras similares.

`enrichment` reserva versión, estado, referencias de adjuntos y propuestas para una futura incorporación de fotos de tapa/índice y OCR/IA. **No hay extracción del índice con IA aún.** El índice es opcional y está plegado en el formulario. Las fotos del estado físico sí están implementadas: un almacén separado de IndexedDB v2 conserva una foto por ejemplar, elegida o tomada por el bibliotecario. Se reencodifica como JPEG en el dispositivo (hasta 1400 px, hasta 600.000 caracteres), sin conservar EXIF. Las fotos nunca se envían a un servicio externo. Reemplazar una foto afecta solo al ejemplar elegido; eliminar el libro o reducir ejemplares elimina sus fotos asociadas. Se incluyen en los respaldos v3. Cualquier clave privada de IA deberá permanecer en un servidor.

## Desarrollo y pruebas

Requiere Node.js 20+ (recomendado 22+). No necesita instalar dependencias para ejecutar el sitio.

```sh
node scripts/serve.mjs
node --test tests/*.test.js
node tests/browser.cjs
node tests/isbn-browser.cjs
node tests/photos-browser.cjs
node tests/migration-browser.cjs
```

Servidor: http://127.0.0.1:4173. Las pruebas de navegador usan Playwright y Edge; `PLAYWRIGHT_MODULE` permite señalar un módulo instalado. `tests/browser.cjs` también acepta `BROWSER_CHANNEL`. Las consultas externas se simulan en las pruebas deterministas. Cubren persistencia, búsqueda, edición, eliminación, respaldos, caracteres HTML, alta por ISBN, duplicados, cancelación, fallas de API, cámara simulada y pantallas de 320/390/740/1440 px. Capturas y datos aislados en `qa/`, excluidos de Git.

## Publicación

GitHub Pages: rama `main`, raíz `/`. Todos los recursos tienen rutas relativas; `.nojekyll` permite servir los módulos directamente. URL del proyecto: https://sanlean.com.ar/AsistenteBibliotecario/ (hereda el dominio del sitio de cuenta SanLean17.github.io).

**Este repositorio no debe copiar el CNAME `sanlean.com.ar` del sitio principal:** reasignaría el dominio. Se usa la ruta del proyecto, sin cambiar DNS ni archivos del otro repositorio. Un subdominio dedicado requeriría DNS y validación propios. Los datos locales de localhost y del sitio publicado son independientes; exportar/importar para trasladarlos.

Documentación de las integraciones: [Google Books](https://developers.google.com/books/docs/v1/using), [Open Library](https://openlibrary.org/dev/docs/api/books).

## Ficha compacta y temas en español

La portada editorial se puede ampliar. Una sección diferente permite sacar/elegir una foto de cada ejemplar físico y ampliarla. Se muestran cuatro temas; el resto de temas resumidos, los datos editoriales y las etiquetas originales quedan plegados.

`src/subjects.js` aplica un vocabulario controlado en español a etiquetas conocidas y sugiere la categoría solo cuando encuentra una forma bibliográfica explícita (novela, poesía, cuentos, etc.). No es traducción libre ni IA: las etiquetas desconocidas se conservan en `sourceSubjects`, sin inventar equivalencias. Las listas de obras de Open Library pueden mezclar adaptaciones o idiomas; los originales están disponibles para inspección, no se presentan como certeza sobre la edición. Los libros anteriores también reciben esta presentación al leerlos, sin nuevas consultas de red; cualquier categoría ya elegida distinta de Otros se conserva. La categoría sugerida se puede corregir.

La fixture `tests/fixtures/hobbit.json` contiene metadatos públicos consultados para ISBN 9505470630 el 2026-10-04. La prueba de escaneo genera localmente su EAN-13 equivalente 9789505470631 y lo decodifica con el ZXing real.

## Dependencia del lector

`vendor/zxing-browser-0.2.1.min.js` es la distribución UMD sin modificar de `@zxing/browser@0.2.1`, obtenida del registro npm oficial. Se carga solo al escanear si hace falta. Incluye ZXing/library. Licencias y avisos en `vendor/ZXING-LICENSE.txt` y `vendor/ZXING-LIBRARY-LICENSE.txt`.
