# Red Escolar V1: archivos locales entre bibliotecas

Red Escolar permite probar la búsqueda y la cooperación entre instituciones antes de construir una red online. Funciona en este navegador con archivos elegidos por Biblioteca. No descubre escuelas, sincroniza catálogos ni envía solicitudes, correos o notificaciones. El selector de personas sigue siendo una simulación local, no un inicio de sesión seguro.

Entrá desde **Gestión → Red Escolar**. Está habilitada para Biblioteca, Autoridad y quienes tengan el permiso vigente **Gestionar cooperación entre bibliotecas**.

## Qué archivo compartir

| Archivo | Uso | Contenido |
| --- | --- | --- |
| Respaldo institucional | Recuperar o trasladar el espacio privado | Catálogo, personas, circulación, permisos, fotos y seguimiento local, incluida Red Escolar |
| Catálogo compartible | Consultar materiales de otra escuela | Identidad institucional, datos bibliográficos y disponibilidad agregada en una fecha concreta |

**Nunca mandes el respaldo privado como catálogo compartible.** Red Escolar lo rechaza. La importación de un catálogo remoto tampoco incorpora libros ni ejemplares a tu catálogo propio. Para adoptar un catálogo como propio usá el [Centro de Migración](MIGRACION.md), un flujo diferente.

El catálogo compartible incluye título, responsable, tipo, editorial/publicación, fecha, idioma, temas, identificadores y cantidades disponibles/no disponibles. Puede incluir una fecha estimada y un enlace bibliográfico HTTP/HTTPS. Opcionalmente conserva el código AB del propietario y la referencia global de los ejemplares prestables.

No incluye nombres de prestatarios, personas, emails, préstamos o reservas individuales, permisos, auditoría, notas privadas, ubicación física exacta, fotos ni feedback del piloto. Revisá igualmente los títulos y temas: cualquier texto personal escrito manualmente dentro de un campo bibliográfico sigue siendo texto bibliográfico y no se puede reconocer automáticamente como dato privado.

## Exportar desde la escuela A

1. Abrí **Exportar mi catálogo compartible**.
2. Seleccioná materiales y pulsá **Hacer compartibles los seleccionados**. Por defecto, los materiales son **Solo local**. La elección se conserva en este dispositivo.
3. Si hace falta identificar ejemplares concretos, elegí incluir sus identidades mínimas. No se agregan ubicaciones ni historial.
4. Pulsá **Revisar antes de exportar**. Comprobá la institución, cantidades y alcance de privacidad.
5. Descargá el JSON. Compartilo con la otra escuela por un medio acordado fuera de la aplicación.

Marcar un material como compartible no publica ni envía nada. Volverlo a Solo local lo excluye de las próximas exportaciones; no retira archivos que ya entregaste. El material en sala, deteriorado, no prestable o dado de baja puede figurar como existente, pero no se ofrece como prestable. Los préstamos locales vigentes reducen el agregado sin revelar quién tiene el ejemplar.

## Importar en la escuela B

1. Abrí **Agregar catálogo compartido** y elegí el JSON.
2. Pulsá **Validar archivo**. Se comprueban versión, identidad, campos permitidos, cantidades, referencias y checksum si existe.
3. Revisá institución, fecha y primeras fichas. El máximo es 10 MB y 10.000 registros por archivo; hasta 20 instituciones y 50.000 registros remotos en el espacio local.
4. Marcá la confirmación e importá. Tu catálogo propio permanece separado.

Si ya existe esa institución, se muestran las fechas y cantidades anterior/nueva y se exige confirmar el reemplazo completo. No se mezclan versiones. Un archivo anterior puede reemplazar al actual si lo confirmás tras la advertencia. Se guardan hasta cinco resúmenes de actualizaciones, sin duplicar los catálogos viejos. No podés importar tu propia identidad institucional como remota.

El checksum SHA-256 detecta cambios respecto del contenido del archivo. **No certifica quién lo creó ni es una firma digital.** Pedí archivos a la institución conocida y verificá su nombre por fuera de la plataforma.

## Buscar y comparar

Buscá, por ejemplo, “Segunda Guerra Mundial”. Podés filtrar por institución, tipo, disponibilidad informada y tema. Cada resultado identifica a la escuela propietaria y cuándo compartió el archivo. Desde los siete días se advierte que la disponibilidad puede haber cambiado; no es un error.

La ficha remota es de solo lectura. No permite editar ni generar ejemplares propios. Confirmá siempre la disponibilidad con la escuela: no es información en tiempo real. Abrir un enlace bibliográfico es una acción explícita y puede visitar un sitio externo; el archivo importado nunca se envía allí.

**Comparar con mi catálogo** muestra coincidencias por ISBN canónico (incluye equivalencias ISBN-10/13), materiales sin coincidencia a cada lado y posibles respuestas a necesidades abiertas. Sin ISBN coincidente no se afirma que sean ediciones diferentes: requiere revisión. No se importan ni fusionan registros. Desde Planificar colección y búsquedas sin resultados también podés buscar en Red Escolar.

## Preparar y seguir una cooperación

1. Desde la ficha remota elegí préstamo interbibliotecario, intercambio, consulta/referencia u otro. Los préstamos no aparecen si el archivo no informa el material como prestable.
2. Si corresponde, seleccioná un ejemplar y vinculá una necesidad local. La necesidad **no se resuelve automáticamente**.
3. Creá el borrador. En **Cooperaciones**, pasalo a **Preparado**: registro listo para continuar el acuerdo por fuera de la plataforma. Nada se envía.
4. Tras contactar a la escuela por otro medio, registrá **Acordado**.
5. Al recibir el material físico, elegí **Recibido**, condición y devolución prevista. Si no venía un ejemplar identificado, registrá el AB que informa la escuela propietaria.
6. Al devolverlo, elegí **Devuelto**, condición y observación opcional. Se conservan fechas y seguimiento. Una diferencia de condición no atribuye responsabilidad por daño.

Se puede cancelar un borrador, preparado o acuerdo aún no recibido. Después de recibir, primero se registra la devolución. Los filtros permiten revisar institución, tipo, estado y dirección.

Desde una ficha propia, **Ofrecer a otra biblioteca** crea una oferta local, incluida donación ofrecida. La otra institución debe tener un catálogo cargado. El seguimiento de ofertas no publica, reserva ni realiza un préstamo en Circulación; sus estados registran el acuerdo externo. Coordiná la disponibilidad del catálogo local con Biblioteca.

## Ejemplares externos y códigos

Belgrano puede tener **AB-000001** y Sarmiento también. En Red Escolar se muestra escuela + AB; la referencia global combina ambas identidades y evita la colisión. No debe reemplazarse por un ISBN o código de inventario legado.

Un **Material externo recibido** queda separado del catálogo propio. Conserva el AB y la identidad de su propietario; no consume un AB local. V1 no permite prestarlo a personas de tu institución, imprimirlo como ejemplar propio ni incluirlo en inventario local. Registrá su devolución desde Cooperaciones. Esta limitación evita mezclar propiedad y circulación.

## Respaldo y recuperación

Exportá el respaldo institucional privado antes de cambios importantes. Incluye catálogos remotos, solicitudes, ofertas y materiales externos. La restauración valida las referencias y los checksums antes de escribir; un error cancela la operación completa. Los respaldos anteriores sin Red Escolar siguen funcionando y dejan sus nuevos almacenes vacíos. No se afirma que el respaldo esté seguro solamente porque comenzó la descarga.

## Qué falta para una red online

Esta versión no tiene backend, pagos ni servicios de sincronización. Faltan identidad y autorización reales entre escuelas, descubrimiento, acuerdos de publicación, sincronización y conflictos, solicitudes autenticadas, notificaciones y auditoría distribuida. El [contrato futuro](RED-ESCOLAR-CONTRATO.md) es documentación, no una conexión activa.

Las escuelas Belgrano, Sarmiento y San Martín de los tests son ficticias. Nunca se cargan automáticamente en producción.
