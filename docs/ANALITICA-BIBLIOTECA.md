# Circulación avanzada, historial institucional y analítica útil V1

Biblioteca y Autoridad abren **Circulación y analítica** desde Inicio (`#analitica`). El panel deriva información de los registros locales: no transmite datos, no incorpora un servicio de seguimiento y no guarda tablas de métricas. No califica docentes, estudiantes ni lectores. No toma decisiones automáticas.

## Períodos y lectura de los números

Se puede elegir hoy, últimos 7/30 días, año actual, ciclo lectivo o fechas personalizadas. Los ciclos requieren indicar sus fechas: no se presume un calendario escolar. Los límites son medianoches locales, con el último día incluido; el informe indica la zona horaria del dispositivo. Los registros antiguos que solo tienen una fecha se interpretan como un día local. El intervalo anterior para comparar ciclos también se elige explícitamente. Solo se ofrece variación porcentual si ambos registran al menos 5 préstamos; nunca se divide por cero.

Los flujos corresponden al período. La colección, la disponibilidad, las ubicaciones, el estado físico y las necesidades abiertas describen el estado actual. El informe no reconstruye una foto histórica inexistente de la colección. Las fechas inválidas no participan de métricas temporales.

- Préstamos: fecha de inicio. Devoluciones: fecha efectiva de devolución, aunque el préstamo empezara antes del período.
- Ejemplares/materiales utilizados: identidades distintas en los préstamos iniciados.
- Duración media y mediana: solo préstamos devueltos con fechas válidas; muestra el tamaño de la muestra. La política actual sirve de referencia, no se supone que fuera la vigente al prestar.
- Devoluciones fuera de plazo: compara devolución con vencimiento registrado, con numerador y denominador explícitos. La media de demora incluye solo las tardías. No genera sanciones.
- Reservas: creación y transiciones listas/retiradas/vencidas/canceladas. Se usan eventos, fechas específicas o, como respaldo, la última fecha de actualización si coincide con el estado actual. No se infieren estados anteriores. La espera lista → retiro exige ambas fechas.
- Renovaciones: eventos de solicitud, aprobación y rechazo. No se inventan motivos que no estén registrados de forma estructurada.

## Búsquedas y demanda

Se cuentan búsquedas enviadas desde Inicio, el botón **Buscar** o Enter en Catálogo y el formulario de Hemeroteca. Escribir letras, cambiar filtros, volver a una pantalla o recalcular un informe no registra búsquedas nuevas. Una apertura desde un resultado registra solo el material y si hubo coincidencia de contenido interno; no guarda quién abrió ni el texto de esa consulta. Las búsquedas enviadas conservan término, cantidad de resultados y fecha, sin actor ni identificador de usuario en los nuevos eventos.

Los términos se normalizan por espacios, mayúsculas y acentos. El panel de términos frecuentes requiere al menos 3 búsquedas. Las búsquedas sin resultado se muestran como observaciones, aun con una sola ocurrencia, sin llamarlas tendencias. Las necesidades y las señales docentes son fuentes separadas: no se suman como si fueran búsquedas adicionales. Las resoluciones muestran únicamente el método registrado (material existente, adquisición, cooperación, etc.). No se presumen búsquedas físicas, lecturas completas ni intentos de reserva que nunca se registraron.

Se omiten términos que contienen nombres completos conocidos, correos, direcciones web o secuencias numéricas largas. Es una protección básica, no un detector universal de datos personales escritos en texto libre. Antes de compartir un informe, revisar títulos, temas y términos institucionales. Las notas de circulación, observaciones de personas y relatos privados nunca se exportan en este informe.

## Demanda frente a cantidad de ejemplares

La tabla muestra sus componentes, todos del período elegido:

`puntos = 2 × reservas válidas + préstamos + aperturas desde resultados + proyectos institucionales vinculados`

Las reservas canceladas/vencidas no suman presión. Cada proyecto cuenta una vez por material aunque tenga varios artículos vinculados. La sugerencia **Posible necesidad de otro ejemplar** requiere al menos 3 reservas válidas, 3 préstamos repartidos en al menos 2 días y hasta 2 ejemplares habilitados. Habilitado excluye perdidos, retirados, dañados o restringidos. La tabla muestra cantidad de ejemplares y componentes; el cálculo no decide una compra ni sustituye el presupuesto o el criterio bibliotecario.

El listado de poco uso permite cambiar el umbral de días. Distingue ausencia de préstamos registrados de falta de circulación reciente. La consulta en sala y el uso sin registro pueden explicar esos casos. Se propone revisar pertinencia o ubicación; no es un error de calidad ni motivo automático de baja. Una demanda sin resultado puede seguirse en Planificar colección o Red Escolar.

## Historiales

Desde la ficha de un material, **Historial del material** muestra préstamos, reservas, renovaciones, incidentes, proyectos institucionales, aperturas registradas, última circulación y disponibilidad de sus ejemplares. Cada código abre **Historial del ejemplar**, con préstamos/devoluciones, estados, cambios de ubicación, revisiones e inventarios. Las fechas o estados previos ausentes se dejan sin informar. Un empeoramiento describe una observación, no atribuye responsabilidad.

Docente/Lector acceden a **Mi historial** desde Inicio: solo sus préstamos, reservas y renovaciones. Un permiso aislado de estadísticas no abre analítica institucional para estos perfiles. La consulta individual de otra persona se limita al permiso de gestión de préstamos ya existente; no hay listados competitivos de personas.

## Estado, inventario, pedagogía y hemeroteca

Los cambios físicos se basan en eventos con estado anterior/final. La revisión de conservación puede señalar dos o más empeoramientos, revisiones o entradas a restricción en el período elegido, además del estado actual. El historial permite interpretar esos casos. Las referencias de préstamos/reservas sin un material o ejemplar actual se señalan para revisar en Calidad de datos; no se inventan fichas para repararlas.

Los inventarios muestran esperados, encontrados, fuera de lugar, no escaneados y fuera de zona. **No escaneado no significa perdido**. Solo se comparan sesiones cerradas de una misma zona identificada; las cantidades esperadas también se muestran porque el fondo puede haber cambiado. Los préstamos por sector/estantería usan la ubicación actual: no afirman dónde estaba el ejemplar en el pasado. Las reubicaciones registradas se cuentan aparte.

Solo se incluyen proyectos de visibilidad institucional y experiencias aprobadas. Los proyectos con creación/actualización en el período se muestran con su estado actual, materiales y temas. Los vínculos nuevos a materiales se fechan por su creación. Los proyectos privados quedan fuera incluso para Biblioteca. No se califica ni ordena a sus autores.

La hemeroteca suma préstamos/reservas de números y aperturas explícitas desde resultados. Una coincidencia interna no demuestra que se leyera el artículo. Los años y publicaciones consultadas solo se basan en esas aperturas; no se reconstruyen a partir del contador histórico general de Hemeroteca.

La cooperación cuenta transiciones registradas y necesidades resueltas mediante intercambio/préstamo interbibliotecario. No compara escuelas. La migración muestra ejemplares identificados por el informe de importación, su comprobación física en inventarios y si tienen préstamos. Importar nunca cuenta como circular.

## Informes, accesos y respaldo

- JSON: proyección agregada completa, sin personas, préstamos individuales ni notas privadas.
- HTML imprimible: resumen de biblioteca, con hasta 100 filas por tabla; el JSON y los CSV conservan las filas completas correspondientes.
- Informe breve para dirección: colección, circulación, reservas, demanda y estado físico.
- CSV: materiales, búsquedas sin resultado, demanda y ejemplares para revisar. Las celdas que podrían ejecutar fórmulas se neutralizan.

Los informes son archivos locales descargados manualmente. No se envían automáticamente. Las tablas admiten teclado y desplazamiento horizontal, las barras incluyen texto/cantidad y los colores no son la única señal.

No hay nuevas stores ni métricas persistidas: IndexedDB permanece en v14 y el respaldo completo en v5. El respaldo conserva préstamos, reservas, actividad y demás fuentes; restaurarlas permite reproducir el informe con la misma fecha de referencia. Respaldos antiguos funcionan con los datos disponibles, sin rellenar actividad ficticia.

## Rendimiento y límites

La prueba automática cubre 10.000 materiales, 20.000 ejemplares, 50.000 préstamos y 20.000 reservas/eventos. El informe usa mapas y un worker local; la portada utiliza una proyección breve sin construir todas las tablas. Las vistas limitan filas para evitar miles de elementos DOM. No se agregan bibliotecas de gráficos ni servicios externos.

Los indicadores reflejan lo registrado en este navegador y esta institución. El borrado o la falta de historia reduce la evidencia. La aplicación muestra “No hay datos suficientes para este período” y no fabrica porcentajes o tendencias. No se usa IA, no se compran materiales, no se sanciona, no se da de baja, no se modifica la política ni se cambia una ubicación automáticamente.
