# Traer el catálogo de tu escuela

Entrá a **Importar / exportar → Centro de Migración** (`#migracion`). El archivo se procesa en este dispositivo. No hay cuenta externa, servidor, costo ni envío a Open Library o Google Books. Necesitás permisos para crear materiales y ejemplares. No se consulta metadata en Internet durante una migración.

## Antes de empezar

Exportá un respaldo JSON desde la biblioteca actual y guardalo fuera del navegador. Comprobá que el archivo exista y conservá una copia en otro dispositivo. Haber presionado Descargar no prueba que haya un respaldo recuperable.

Probá primero con un archivo pequeño. Identificá la institución activa y quién realizará la migración. No trabajes simultáneamente sobre el catálogo desde otra pestaña mientras revisás: si cambia, deberás analizar de nuevo.

## Preparar el archivo

- **Aguapey:** exportá MARC / ISO2709 en UTF-8 (`.iso`, `.mrc`). Se leen 001, 020, 022, 100/110, 245, 250, 260/264, 300, 490/830, 500, 505, 520, 650, 700 y datos de ejemplares 852/859. Sin campos de ejemplares no se inventan copias: revisá la cantidad. El contenido 505 queda dentro de la ficha, nunca como libros separados. Una nota 505 sin títulos separados conserva su texto como una entrada para revisión.
- **Excel:** Guardar como → CSV UTF-8. No se leen XLS/XLSX nativos. Conservá los inventarios con ceros iniciales como texto antes de exportar. Si la planilla ya perdió los ceros, no podemos reconstruirlos.
- **Google Sheets:** Archivo → Descargar → Valores separados por comas. Una hoja por archivo.
- **CSV/TSV:** coma, punto y coma o tabulación; celdas con separadores o saltos deben ir entre comillas dobles. Una comilla interna se escribe dos veces. Podés indicar que no hay encabezados y mapear por posición.
- **JSON propio:** se aceptan versiones 1–5 para extraer materiales y ejemplares. Se generan identidades y códigos AB nuevos; no se trasladan personas, permisos, préstamos, fotos ni historial del sistema de origen. Para recuperar toda una instalación, usá **Importar respaldo JSON**, que es un flujo separado.

Límites por archivo: 20 MB, 10.000 registros, 80 columnas, 20.000 caracteres por celda y 30.000 ejemplares. Los campos también tienen límites propios del catálogo, informados como errores antes de importar. Dividí los archivos mayores.

## Seis pasos

1. **Elegir:** seleccioná formato y archivo. UTF-8 es la opción predeterminada. Si falla y conocés el origen, elegí Windows-1252 (también sirve para texto occidental común exportado como Latin-1).
2. **Analizar:** comprobá cantidad, delimitador y primeras filas. Revisá especialmente `á é í ó ú ñ ü`. No se convierte encoding automáticamente. MARC-8 requiere conversión previa a UTF-8 fuera de la aplicación; incluso un MARC-8 que solo contiene ASCII se rechaza.
3. **Mapear:** cada columna apunta a un campo o a Ignorar. Las sugerencias se basan únicamente en nombres conocidos. `id` nunca significa ISBN ni AB. Podés guardar/borrar presets locales: contienen nombres de columnas, destinos y separador interno, sin filas del archivo. Se aplican solo si los encabezados coinciden.
4. **Revisar:** cada fila indica si es nueva, una edición existente, una posible misma obra, similar o con errores. Se muestran 25 filas por página, con filtros y detalle de contenidos. Un análisis de similitud parcial se indica y requiere decisión manual. Título y autor no fusionan fichas. El ISBN válido identifica una edición; varias filas de esa edición pueden aportar ejemplares distintos.
5. **Importar:** revisá las decisiones y marcá la confirmación final. Podés cancelar antes del guardado. El catálogo, los códigos y el informe se guardan en una sola transacción. Ante un error no queda una mitad importada. No cierres la pestaña durante este paso.
6. **Resumen:** descargá el informe, revisá Calidad, imprimí etiquetas AB y planificá el inventario físico.

## Qué se conserva y qué requiere una decisión

Las ediciones existentes se **mantienen por defecto**. Podés elegir agregar ejemplares solamente o completar campos vacíos y agregar ejemplares. Ninguna opción reemplaza valores presentes. Los campos comunes de una obra con varias ediciones vinculadas no se completan desde la migración: revisalos en el catálogo.

Filas equivalentes por ISBN dentro del archivo se agrupan bajo una edición propuesta. Si omitís la fila que define esa edición, también omití sus filas dependientes o volvé a analizar: el guardado se rechaza si el destino no existe. Cuando hay varias fichas existentes con el mismo ISBN, resolvé primero esa duplicación en Calidad.

Un inventario legado repetido dentro de la misma edición no agrega otra copia. El mismo inventario en materiales diferentes detiene la importación completa: revisá o separá esas filas. Sin inventario legado no se puede reconocer con seguridad una copia reimportada; se muestra una advertencia.

El **código AB** se genera con el contador actual, sin reciclar ni renumerar los existentes. El **inventario legado** conserva la referencia antigua. Nunca se usa el número antiguo como código AB. En una fila con cantidad mayor a uno y un único inventario, ese inventario corresponde solo al primer ejemplar; las demás copias quedan sin referencia de origen.

Temas y autores permiten separador interno `|`, `;` o salto de línea. Las comas dentro de nombres se conservan. Se limpian espacios y repeticiones de términos que solo difieren en mayúsculas; no se sustituyen sinónimos. Los contenidos se guardan como entradas de la misma ficha.

Estado físico: `Nuevo`, `Bueno`, `Regular` o `Deteriorado`. Política: `standard` (préstamo normal), `room-only` (sala) o `non-renewable` (sin renovación). Los valores desconocidos requieren corrección. El texto antiguo de ubicación se conserva; no se crean sectores/estanterías automáticamente. Organizá después las ubicaciones y asigná cada ejemplar desde Inventario.

## Después de migrar

El historial queda en los ajustes institucionales locales y viaja en el respaldo JSON. Guarda fecha, origen, nombre del archivo, conteos, identificador local del actor, mapeo y diagnóstico por fila; no duplica el archivo ni guarda listas de personas. Evitá nombres de archivo o encabezados con información personal innecesaria. El informe es JSON descargable.

Las filas omitidas sin errores pueden enviarse explícitamente a la Jornada existente para revisión (hasta 100 por envío). Enviar a Jornada no incorpora esas fichas al catálogo. No se trasladan registros con errores hasta corregirlos. Conservá el archivo original para revisar los pendientes.

Las etiquetas usan exclusivamente AB como identificador primario. Seleccioná todas las copias nuevas o filtrá por ubicación; imprimí como máximo 200 por tanda. Comprobá una etiqueta impresa antes de usar todo el lote. El inventario de validación debe iniciarse manualmente para comprobar que los ejemplares existen físicamente.

No hay un botón Revertir: préstamos, reservas, ediciones completadas y otras operaciones posteriores hacen inseguro un deshacer parcial. **Restaurá el backup previo** si necesitás recuperar el estado anterior y conservá también un respaldo actual para revisar las operaciones posteriores.

## Exportar CSV

Se descargan dos archivos UTF-8 con BOM, comas y celdas entre comillas:

- `materiales.csv`: id material, título, autor, ISBN, ISSN, DOI, editorial, año, tipo, temas, contenidos y cantidad.
- `ejemplares.csv`: id material, título, autor, ISBN, código AB, inventario legado, ubicación y estado. Una fila por copia.

El id material permite relacionar ambos archivos. Para reimportar ejemplares mapeá explícitamente `inventario legado` y dejá `código AB` ignorado. Temas/contenidos se separan con `|`; si un término contiene ese carácter, elegí otro separador o ajustá la planilla antes de volver a importar. CSV es un formato de intercambio, no reemplaza al backup JSON completo.

Para evitar fórmulas ejecutables en planillas, los valores que comienzan con `=`, `+`, `-` o `@` (incluidos espacios iniciales) llevan un apóstrofo protector. Se conserva al volver a importar y debe revisarse como texto.

## Límites deliberados

No se habilita exportación MARC: falta validación bidireccional con Aguapey real. Los fixtures sintéticos prueban el parser y los mapeos; no equivalen a certificar cualquier exportación de una escuela. No hay conversión MARC-8 interna, importación masiva de personas ni asignación automática de perfiles. La adopción con datos institucionales reales requiere una prueba pequeña, revisión humana y respaldo previo.
