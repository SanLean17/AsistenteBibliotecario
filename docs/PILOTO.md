# Piloto escolar

El piloto es una prueba controlada en una escuela, con datos guardados en un navegador. No crea un servicio online ni sincroniza dispositivos.

## Antes de empezar

1. Elegí el navegador y dispositivo de trabajo. No uses una ventana privada.
2. Desde Biblioteca o Autoridad, abrí **Piloto escolar** y revisá **Puesta en marcha**: institución, biblioteca, responsable habilitado, política de préstamos y ubicaciones.
3. Exportá un respaldo inicial si ya hay datos. Comprobá que el archivo existe y conservá una copia en un lugar elegido por la institución.
4. Activá el modo piloto con un nombre y notas sin datos personales. Aparecerá una franja con institución y fecha de inicio. No cambia permisos.

No hay un número mínimo obligatorio de materiales. Tampoco se cargan datos demo automáticamente: usamos materiales y operaciones elegidos por la institución para evitar mezclar datos ficticios con registros reales.

## Tres días sugeridos

| Día | Prueba |
| --- | --- |
| 1 | Configurar, cargar algunos materiales (20–30 es solo una sugerencia), revisar ejemplares AB y ubicaciones, imprimir etiquetas y buscar por título, autor, tema y contenido. |
| 2 | Probar con perfiles mínimos de docentes/lectores. Guardar, reservar, retirar en Mostrador, prestar y devolver. Comprobar que cada lector ve su propia actividad. |
| 3 | Hacer un inventario parcial, revisar calidad y búsquedas sin resultados, registrar dificultades y exportar el informe del piloto. |

En **Probar la plataforma**, cada tarea admite pendiente, completada o dificultad. Los préstamos, devoluciones, reservas, retiros y escaneos de inventario se reconocen desde operaciones reales durante el período del piloto. Las búsquedas necesitan confirmación manual después de probarlas; abrir un enlace no las completa. No deducimos que una tarea salió bien por haber pulsado un botón.

## Cuando encontrás una dificultad

Usá **Registrar observación**, disponible en la franja del piloto para Biblioteca/Autoridad. Se abre sobre la pantalla actual, para poder continuar Mostrador al cerrarlo. Elegí área, tipo y severidad, y escribí qué pasó y qué esperabas. No incluyas nombres de estudiantes, correos, contraseñas ni información sensible.

Las observaciones solo quedan en IndexedDB de esta institución. No se envían por correo ni a ningún servidor. El contexto automático se limita a sección (sin identificadores ni parámetros), ancho de pantalla, tema, familia del navegador y fecha. No guarda capturas, conversaciones, catálogo completo, URL completa ni pila técnica del error. Podés marcar observaciones como revisadas, resueltas o descartadas.

El informe JSON incluye conteos, período, tareas y agrupaciones de fricción. Omite identidades, consultas textuales y descripciones de observaciones. Para ver términos de búsquedas sin resultados, usá **Planificar colección**, dentro de los permisos de gestión existentes. No se compran materiales automáticamente.

## Respaldo, verificación y recuperación

**Última exportación iniciada** solo informa que se inició una descarga. No confirma que terminó ni que conservaste el archivo. Exportá antes de una restauración completa, un borrado o una corrección masiva, aunque hayas exportado hace poco.

**Verificar archivo / importar** muestra institución, fecha del archivo, materiales, ejemplares, personas, préstamos activos, reservas, jornadas e inventarios. La vista previa no escribe. Cancelá para terminar una verificación sin restaurar.

La restauración completa valida otra vez dentro del almacenamiento. Si hay errores estructurales o de integridad, la transacción se cancela sin una escritura parcial. No permite reemplazar una institución que tiene préstamos o reservas activas. Conserva la secuencia AB más alta para no reutilizar códigos. Las referencias históricas a materiales retirados o ubicaciones pendientes pueden producir advertencias; se informan al finalizar.

Una comprobación práctica de restauración es opcional. Hacela en otro navegador/perfil vacío y revisá catálogo, códigos, fotos y operaciones. No uses el dispositivo de trabajo como lugar para experimentar con restauraciones. Los respaldos incluyen datos institucionales/personales: la escuela decide dónde conservarlos y quién accede.

## Si algo sale mal

1. No borres los datos del navegador.
2. Intentá exportar.
3. Registrá una observación, si el almacenamiento todavía responde.
4. Recargá y revisá la operación antes de repetirla.
5. Restaurá solo cuando haga falta, verificando el archivo y exportando el estado actual primero.

Un aviso de error inesperado permite reintentar la pantalla, volver al inicio o exportar. No muestra una pila técnica ni registra incidentes automáticamente. Si IndexedDB no está accesible, puede no ser posible exportar o guardar una observación; el diagnóstico lo indica.

## Cámara, conexión y dispositivos

**Comprobar almacenamiento y cámara** informa almacenes, versión, institución, catálogo, integridad y espacio aproximado si el navegador lo ofrece. También detecta BarcodeDetector, comprueba la alternativa ZXing y consulta el estado de permiso de cámara cuando está disponible. No prende la cámara. La disponibilidad de una API no prueba la cámara física: verificá un escaneo real en cada equipo. Si el permiso se deniega, podés usar foto, código manual o lector USB.

Una aplicación ya cargada puede operar con su catálogo y almacenamiento local sin red. Las consultas bibliográficas externas necesitan conexión; si fallan, seguí con carga manual. No hay garantía de inicio offline desde cero ni una PWA instalada. El OCR y sus recursos son locales, pero los archivos del motor deben poder cargarse en el navegador antes de trabajar sin red.

Para pasar de teléfono a PC: exportá, transferí el archivo por el medio que elija la escuela, verificá e importá. Comprobá el resultado y elegí un dispositivo de trabajo. Es transferencia de una copia, no sincronización.

## Fin del día y del piloto

Revisá préstamos pendientes, jornadas e inventarios abiertos (guardados localmente), observaciones y la recomendación de exportar. La lista no bloquea salir ni asegura que guardaste una copia externa.

**Finalizar piloto** apaga el indicador y detiene la captura de nuevas observaciones. Conserva catálogo, circulación, jornadas, inventarios, tareas y observaciones. No devuelve libros ni cierra operaciones automáticamente. Podés seguir revisando observaciones y exportar el informe del período cerrado. Si vas a iniciar otro piloto, exportá antes el informe del anterior.
