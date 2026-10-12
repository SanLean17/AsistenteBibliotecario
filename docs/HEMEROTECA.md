# Hemeroteca y publicaciones seriadas V1

## Publicación, número y ejemplar

La ruta `#hemeroteca` organiza revistas, diarios, boletines, publicaciones institucionales y otros seriados. La publicación madre se registra una vez en `serialPublications`. Guarda título, ISSN/eISSN, entidad responsable, lugar, periodicidad, idioma, temas, descripción, fuentes y un enlace oficial opcional.

Un `serialIssue` identifica un número concreto y tiene un `materialId`. Ese material sigue siendo un registro de `books`, con su propia obra/edición de compatibilidad, ejemplares, códigos AB, inventario legado, ubicación, condición, cuidado y estado. La publicación madre no es una obra monográfica compartida: los números no comparten automáticamente contenidos ni descripción. `serialPublicationId` y `serialIssueId` conservan la jerarquía explícita.

Los campos circulables del número se editan en el material y se sincronizan a `serialIssues` dentro de la misma transacción. La publicación proyecta su título, ISSN, tipo y temas al material. No hay copias ni inventario paralelos. Cambiar metadatos conserva los UUID y códigos AB existentes.

Los registros anteriores no se convierten automáticamente. En Hemeroteca, **Revisar revistas y diarios anteriores** permite seleccionar un registro, revisar publicación y número, y vincularlo conservando ejemplares. Los libros y artículos independientes anteriores siguen disponibles en el catálogo.

## Flujo de revista

1. Crear la publicación madre y revisar el ISSN si existe.
2. Agregar un número: fecha completa, o número con año/volumen; indicar cantidad de ejemplares y ubicación.
3. Abrir **Foto de sumario o primera plana**, elegir Índice / sumario y tomar o elegir la foto.
4. Detectar propuestas y revisar título, autor, página/rango, sección, tipo y temas de cada fila.
5. Marcar Aceptar, Editado y aceptado o Rechazar; confirmar las filas aceptadas.
6. Buscar una frase del artículo. El resultado es el número que lo contiene.

Los artículos viven en `books[].contentEntries`, con `issueId` y `materialId`, ID propio, título, subtítulo, autor, página/rango, sección, tipo, temas, fuente y fecha de creación. No reciben ejemplares físicos.

## Primera plana y OCR

Crear el diario, abrir Agregar número y elegir Primera plana. También se puede asistir un número ya registrado. Se reutilizan el motor OCR local y la preparación de imagen existentes. La primera línea propone el nombre de la publicación; las fechas explícitas numéricas o en español proponen la fecha; la línea de edición y las otras líneas proponen contenidos. Es lectura literal y puede separar mal líneas, titulares y bajadas: la persona corrige las filas, sus tipos y sus subtítulos. No interpreta la historia ni inventa temas.

El nombre detectado se muestra para comparar con la publicación seleccionada. Fecha y edición se proponen en **Editar número**, pero requieren **Guardar número**. En el alta, **Crear número con filas aceptadas** guarda los datos revisados y los contenidos seleccionados en una transacción. Para un número existente, los contenidos se confirman por separado. Las palabras clave usan el sugeridor literal existente: se muestran sin aceptar; la persona elige cuáles incorporar al campo de temas. También se puede pegar texto OCR o cargar artículos manualmente. Cancelar o navegar descarta las propuestas sin guardar. No se consulta ninguna API de libros por ISSN.

## Identificadores y duplicados

ISSN identifica la publicación, nunca una copia. Se valida su dígito de control y se normaliza como `NNNN-NNNX`. eISSN se conserva aparte; no se presume que la edición impresa y la electrónica sean intercambiables. Un ISBN de suplemento se conserva en el número sin reemplazar su ISSN.

Un ISSN existente vincula con la publicación correspondiente. Un título igual sin ISSN solo sugiere una coincidencia: no fusiona publicaciones. Un número duplicado fuerte requiere la misma publicación y fecha completa, o número con año/volumen coincidente; datos explícitos contradictorios de fecha, número, volumen o edición impiden fusionar. La numeración sola no basta porque puede reiniciarse cada año.

La periodicidad es opcional. Se muestra la secuencia disponible y el rango de fechas; no se afirman lagunas de colección ni se generan números faltantes.

## Buscar, reservar y enseñar

Las vistas Publicaciones, Números recientes, Por año, Por fecha y Por tema consultan datos reales. Los filtros permiten publicación, año/mes, fecha, número, tipo y tema. La búsqueda general combina título, fecha, número, temas de la publicación, temas del número y contenidos internos. Explica los campos coincidentes y devuelve el material contenedor, nunca un ejemplar adicional por artículo.

**Reservar el número que contiene este artículo** crea una reserva del `materialId` del número, con las reglas normales de la institución. Las políticas son préstamo normal, no renovable y consulta en sala. La publicación sugiere el valor inicial y cada número puede revisarse. Los ejemplares se entregan desde Reservas/Mostrador; consulta en sala no permite la reserva de préstamo.

Docente puede agregar el número o un artículo a un proyecto. El artículo se guarda como referencia `materialId + contentEntryId`; las experiencias docentes también pueden referenciarlo. Las reservas del proyecto se agrupan por material contenedor. No se duplica la ficha.

## CSV y Aguapey / MARC

El Centro de Migración permite mapear Publicación madre, ISSN, Fecha del número, Volumen, Número, Edición/sección, Artículo/titular, Autor del artículo y Página del artículo. Una publicación con fecha o número identifica una intención explícita de importar seriadas. Se revisan las filas antes de confirmar.

Las filas con la misma publicación/ISSN y la misma combinación explícita de fecha, año, volumen, número y edición se agrupan en la primera fila. Sus artículos se incorporan a ese número. Repetir un inventario legado no crea una copia adicional; inventarios distintos sí pueden incorporar copias. Las filas anónimas de artículos no implican más ejemplares. Sin ISSN no se reutiliza por título una publicación preexistente: solo se agrupan las filas del mismo lote revisado. Una reimportación sin códigos legados requiere revisión manual de las cantidades.

MARC conserva 022 (ISSN), 245 (título), 260/264 (editorial y fecha), 310 (periodicidad), 362 (numeración/fechas), 505 (contenidos), 650 (temas), 773 (contenedor) y 852/859 (ejemplares) en los datos o las fuentes originales. Una fecha ISO completa explícita en 362 permite proponer un número seriado. Los rangos libres como “Año 1 (1980)-” permanecen como notas de origen: no se transforman en fechas o números inventados. 773 se conserva como referencia bibliográfica; no genera por sí solo un número físico. Revisar y vincular manualmente los registros cuya estructura no sea concluyente.

## Respaldo, calidad, red y seguridad

IndexedDB versión 14 agrega `serialPublications` y `serialIssues`, sin convertir registros. El respaldo completo formato 5 incorpora ambos almacenes y las relaciones de contenido; los respaldos previos reciben almacenes vacíos. La restauración valida identidades y relaciones antes de escribir y conserva los códigos AB.

Calidad detecta publicación/material contenedor ausente, ISSN inválido, fechas o identidad inválidas, duplicados fuertes y artículos sin número. Los temas y la descripción son opcionales.

La exportación explícita a Red Escolar conserva contrato versión 1 con un campo bibliográfico opcional `material.serial`: publicación, número y referencias locales, junto con la disponibilidad agregada normal. No exporta artículos, personas, préstamos, ubicaciones ni notas internas. La cooperación selecciona el registro remoto del número concreto. Los lectores anteriores que rechacen campos desconocidos necesitan actualizarse para importar esta extensión.

Los enlaces deben ser HTTP/HTTPS sin credenciales. No se alojan PDFs, no hay scraping, suscripciones, backend ni servicios pagos. Títulos y texto OCR se presentan escapados. La foto se procesa localmente y no se conserva en estos formularios; las fotos de ejemplares siguen su circuito habitual.

## Verificación

`npm run test:hemeroteca` cubre dominio, ISSN, identidad, duplicados, confirmación OCR, búsqueda por titular, reserva del contenedor, CSV, relaciones de respaldo, red y escala 100 publicaciones / 5.000 números / 20.000 contenidos.

`npm run test:hemeroteca-browser` recorre revista y diario con OCR simulado en la frontera del proveedor, proyecto docente, reserva, restauración, 320/390/768/1440 y modo claro/oscuro. El motor OCR real se verifica adicionalmente con `test:browser-ocr`. Una cámara, iluminación y calidad de lectura de papel reales requieren prueba en el dispositivo de la escuela.
