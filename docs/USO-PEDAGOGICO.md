# Uso pedagógico de la biblioteca — V1

Proyectos, listas y experiencias locales de una institución. No es un LMS: no hay tareas, notas, asistencia, perfiles obligatorios de estudiantes, envíos ni sincronización.

## Docente

1. Abrir **Mis proyectos → Crear proyecto**. Registrar título, curso, área y temas explícitos. Ciclo lectivo y fechas son opcionales. Elegir privado o institucional.
2. En **Agregar materiales**, buscar con el motor del catálogo; filtrar tema, tipo, disponibilidad o contenidos. Elegir el material entero o un cuento/capítulo/artículo. No se duplican fichas.
3. Agregar notas y propósito, quitar o usar **Subir/Bajar**. También se puede agregar desde la ficha del catálogo.
4. **Preparar reservas** muestra disponibilidad, consulta en sala y reservas propias existentes. Marcar materiales y cantidad. Una selección fallida no registra reservas parciales. Un contenido reserva el contenedor físico una sola vez.
5. Una copia usa las reglas normales de circulación. Varias copias crean una solicitud manual de cantidad: no apartan ejemplares. Biblioteca registra la resolución y gestiona los préstamos con Mostrador.
6. Registrar la actividad realizada como borrador; en el inicio de Mis proyectos, enviarla a revisión. Solo una experiencia aprobada se muestra a otros docentes.
7. Finalizar o archivar proyectos; filtrar por ciclo lectivo. Duplicar conserva planificación/materiales/notas, sin fechas, reservas, préstamos ni experiencias anteriores. La copia es privada.
8. Exportar HTML para imprimir, con opción de excluir notas. Abrir el archivo y pulsar Imprimir.

Las listas rápidas son distintas de favoritos. Biblioteca puede publicar y destacar listas institucionales, sin ejemplos precargados. Un docente puede duplicar una lista compartida para preparar su propia selección y reservas.

## Biblioteca y Autoridad

Mis proyectos muestra proyectos institucionales, reservas vinculadas, solicitudes manuales, experiencias enviadas y señales de demanda. No permite abrir ni modificar proyectos privados ajenos. Aprobar una experiencia es una acción explícita. El docente puede archivarla después.

La selección para aula sigue: planificada → preparada → retirada → devuelta, con cancelación antes del retiro. No cambia ubicaciones ni sustituye préstamos individuales. Los avisos de preparación y aprobación se derivan del estado actual; no se guardan avisos.

Una búsqueda sin resultados permite al docente registrar una señal. Biblioteca decide convertirla en necesidad de colección o consultar Red Escolar. La búsqueda remota usa archivos cargados: muestra escuela y fecha de exportación, nunca disponibilidad local o en tiempo real. El docente prepara una solicitud a Biblioteca; Biblioteca concreta el acuerdo desde Red Escolar. No se envía información fuera del navegador.

## Descubrimiento y privacidad

“De docente a docente” muestra experiencias aprobadas, listas destacadas y recomendaciones reales. Los materiales más reservados aparecen únicamente con al menos cinco reservas confirmadas y tres docentes distintos por material. No hay ranking de personas. Sin actividad, se muestra un estado vacío.

Las sugerencias se explican por temas explícitos compartidos entre catálogo, listas y experiencias aprobadas. Nunca infieren edad ni adecuación a un grado. Los agregados de proyectos usan solamente planes institucionales; las señales se comparten deliberadamente con Biblioteca. Los lectores/estudiantes no acceden a estos recorridos.

Como en el resto del prototipo local, los perfiles controlan interfaz y comandos, no constituyen autenticación contra una persona con acceso a las herramientas del navegador o al archivo de respaldo completo. El respaldo contiene los datos privados de la institución y debe quedar bajo su custodia.

## Persistencia y verificación

IndexedDB 13 incorpora teachingProjects, projectMaterials, savedLists, teachingExperiences, batchReservationRequests, classroomSelections y teachingSignals. Upgrade aditivo, sin borrar stores. Se mantiene el formato de respaldo v5; respaldos anteriores sin estas colecciones se completan con arrays vacíos. Se valida estructura, institución y relaciones; las referencias históricas a materiales/contenidos eliminados se conservan y aparecen en Calidad de datos.

`npm run test:pedagogical` cubre ownership, roles, institución, ciclo de vida, listas, contenido interno, clones, aprobación, reservas atómicas, cantidades, señales, selecciones, avisos, sugerencias y backup. `npm run test:pedagogical-browser` verifica upgrade v12, recorrido Docente/Biblioteca, gestión de reserva, exportación escapada, rutas privadas, restauración y 320/390/768/1440 en ambos temas. Actions exige estas pruebas junto con syntax, integrity, unit y toda la batería de navegador existente.
