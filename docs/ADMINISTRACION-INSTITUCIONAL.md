# Administración institucional V1

La organización de la escuela se conserva por ciclo sin convertir la biblioteca en un sistema académico. Todo permanece en este navegador: no hay backend, cuentas remotas, correos automáticos ni servicios de pago. No se incorporan calificaciones, asistencia, matrícula oficial, DNI obligatorio, domicilio, familia ni salud.

## Organización y recorrido anual

Desde **Organización** se accede a Institución, Ciclos lectivos, Cursos/divisiones, Personas, Asignaciones, Suplencias y Permisos. La misma navegación incluye Importar CSV y Cambio de responsable; Personas y Permisos enlazan sus pantallas existentes.

1. En **Ciclos lectivos**, prepará el año, nombre y fechas opcionales. Activá el ciclo. Solo puede haber uno activo por institución; primero cerrá el anterior.
2. En **Cursos/divisiones**, elegí el ciclo y registrá nivel, grado/año, división, turno y nombre visible. El mismo 5° A de dos años tiene identificadores distintos. Un duplicado exacto dentro del mismo ciclo se rechaza.
3. En **Asignaciones**, elegí docente y curso, fecha inicial, fin opcional, materia y función. Una persona puede tener varios cursos. Para cambiar su asignación, cerrá la anterior y creá la nueva: ambas quedan en el historial.
4. En **Suplencias**, elegí docente suplente, curso y fechas inclusivas; opcionalmente vinculá la asignación reemplazada. Una suplencia puede ser planificada, activa o finalizada.
5. En **Permisos**, vinculá un permiso operativo a esa asignación. El vínculo verifica persona y fechas. El permiso de una suplencia planificada no funciona hasta activarla; tampoco funciona antes del inicio ni al finalizar su último día. Terminar la suplencia o la asignación revoca los permisos vinculados. La fecha y hora dependen del reloj local del dispositivo.
6. Antes del siguiente año, abrí **Revisar cierre**. El checklist incluye cursos, asignaciones, suplencias, proyectos y todos los préstamos/reservas pendientes de la biblioteca. Escribí CERRAR para confirmar.
7. El cierre archiva cursos, termina asignaciones y suplencias y revoca sus permisos vinculados. Podés conservar los proyectos para revisión o completar/archivar los institucionales. Los proyectos privados permanecen para revisión por su docente: no se muestran sus títulos ni se modifican desde este asistente.
8. **Preparar próximo ciclo** permite copiar únicamente la estructura de cursos con nuevos identificadores. No copia personas, asignaciones, préstamos, reservas, proyectos ni listas. Las configuraciones institucionales permanecen vigentes porque pertenecen a la institución.

**Nunca se devuelve un préstamo ni se cancela una reserva por cerrar un ciclo.** Las reservas vinculadas a proyectos archivados/ciclos cerrados muestran advertencia en Uso Pedagógico y conservan su lógica temporal.

## Personas, cargos y bajas

La identidad se conserva en `people`; la vinculación a cada institución está en `memberships`. El cargo y el perfil de acceso son datos distintos. Los cambios guardan cargo, perfil, institución, estado, inicio/fin y actor en `personRoleHistory`. Para datos antiguos cuyo inicio no se conoce se indica que no fue registrado, sin fabricar fechas históricas.

Personas permite activar, inactivar y archivar. Los motivos de baja son opcionales: cambio de institución, fin de suplencia, jubilación, egreso u otro. Antes de una baja se muestran préstamos y reservas pendientes. Si existen, debe confirmarse expresamente su conservación. La baja termina asignaciones y suplencias y revoca todos los permisos adicionales. El aviso de préstamos de personas inactivas permanece visible para gestión. Reactivar no restaura permisos revocados automáticamente.

Se pueden mantener varios responsables de Biblioteca. El checklist de transición pide verificar un respaldo guardado, permisos, jornadas, inventarios y cooperación pendientes. No presume que un archivo exportado siga disponible externamente. La administración principal no se transfiere por un simple cambio de responsable; no puede desactivarse sin la transferencia existente. El sistema impide cambios del propio perfil y respeta la jerarquía para designar autoridades.

Los lectores pueden asociarse manualmente a un curso, individualmente o en lote, con confirmación REASIGNAR. Se conserva un historial mínimo de grupos. No se interpreta como promoción académica. Las personas nunca se fusionan por nombre: una coincidencia solo genera advertencia.

## Permisos y privacidad

Los permisos sin vencimiento se muestran como **Permanentes** y se pueden revocar. Los **Temporales** tienen inicio y vencimiento. Los vinculados a suplencias tienen como máximo su ventana de fechas. El control se aplica al ejecutar operaciones, no solo al ocultar botones. La vigencia se verifica en cada comprobación de acceso; no depende de esperar un proceso programado. La limpieza posterior marca el historial vencido una sola vez.

Organización y sus exportaciones requieren Biblioteca/Autoridad o administración principal vigente en la institución seleccionada. Docente/Lector no obtienen listados institucionales desde estas rutas. Se validan actor e institución al guardar/importar. El selector local permite volver a Administración local, como antes: este producto sigue siendo una aplicación de un navegador con cambio de perfil local, **no autenticación multiusuario ni aislamiento frente a quien controla el dispositivo o sus herramientas de desarrollo**.

Los proyectos nuevos usan ciclos configurados y pueden vincularse a un curso de la asignación docente. Se conservan los proyectos legados con año textual; cuando todavía no se configuraron ciclos, se mantiene esa compatibilidad para no bloquear el uso previo. Las listas pueden ser globales, asociadas a ciclo o archivadas. El cambio de curso no cambia los proyectos anteriores.

## CSV: preparar, revisar y confirmar

Migration Center enlaza la importación institucional. Admite CSV UTF-8 con coma, punto y coma o tabulación, hasta 2 MB y 500 filas. No escribe hasta confirmar IMPORTAR. Los nombres de columnas de persona, identificador interno, perfil, cargo, grado, división, turno, docente y curso son configurables.

- Personas: `nombre,perfil,cargo,id` (solo nombre obligatorio; perfil lector por defecto). Perfiles: docente, personal, lector, biblioteca, autoridad. Biblioteca/Autoridad requieren casilla explícita y autorización efectiva del actor. Un ID interno repetido se rechaza; un nombre repetido requiere revisión explícita y crea otra identidad, nunca una fusión.
- Cursos: `grado,division,turno,nivel,nombre`. Nivel opcional: primary, secondary u other. Se selecciona el ciclo destino. El nombre visible es opcional.
- Asignaciones: `docenteId,cursoId,inicio,fin,materia`. Los IDs deben existir. Inicio es obligatorio; fin y materia son opcionales. Se verifica el ciclo seleccionado.
- Personas con curso: agregar `grado,division,turno,nivel` y seleccionar el ciclo. Se prepara la asociación para lectores o docentes, reutilizando el curso exacto o creando el previsto. Para docentes se requiere `inicio` y se admite `fin`. La vista previa muestra el curso que se asociará. No se infiere un curso desde el nombre ni se crean cursos a partir de texto libre sin preview.

Toda la confirmación es atómica: una fila inválida impide guardar el lote completo. Si cambió el contexto o las coincidencias desde la vista previa, hay que prepararla nuevamente. Para cambiar cursos de lectores existentes se usa la reasignación explícita, no una nueva importación.

Los CSV/HTML exportan cursos activos, asignaciones y suplencias, con nombres e identificadores internos necesarios para operación. Excluyen correo, motivos privados de suplencia, observaciones personales y datos ajenos. HTML escapa contenido y CSV neutraliza fórmulas.

## Avisos, calidad y agregados

El inicio muestra ciclo activo, cursos, docentes asignados, suplencias y permisos que vencen en siete días. Avisos deriva permisos por vencer, suplencias por terminar, ciclo próximo al fin previsto y préstamos de personas inactivas. La señal de curso sin docente se activa solo si la institución la habilita.

Calidad detecta referencias inexistentes, asignaciones de otro ciclo, fechas fuera del ciclo, permisos de personas inactivas, suplencias vencidas pendientes, ciclos activos múltiples y cursos exactos duplicados. Consultar estos datos no escribe avisos ni actividad.

Organización y Analítica muestran agregados por ciclo: docentes con asignación activa, cantidad de proyectos y movimientos de biblioteca dentro de las fechas configuradas (préstamos, devoluciones, reservas creadas y materiales incorporados). Sin ambas fechas no se inventa un total de actividad. No hay rankings ni evaluación de personas.

## Almacenamiento, recuperación y validación

IndexedDB pasa de v14 a **v15**, agregando `academicYears`, `schoolGroups`, `teacherAssignments`, `substituteAssignments`, `personRoleHistory` y `personGroupHistory`. No cambia IDs personales, UUIDs de ejemplares ni códigos AB existentes. Las escrituras usan la transacción institucional existente; abrir un ciclo no toca catálogo ni circulación.

El respaldo v5 incluye todas las stores nuevas y referencias de proyectos/listas/grupos. La restauración valida instituciones, estados, referencias y ventanas de permisos vinculados. Los respaldos antiguos sin organización reciben arrays vacíos; no se inventan ciclos ni cursos. Se mantienen los controles previos de restauración ante circulación abierta.

Pruebas: `npm run test:institutional`, `npm run test:institutional-browser`, suite unitaria completa, integridad, manifiesto offline y pruebas de regresión. El flujo de navegador recorre 2027 → 2028, suplencia y revocación, cambio Docente → Biblioteca → inactivo, export y respaldo roundtrip. Los formularios se operan en 320, 390, 768 y 1440 con revisión de ambos temas. Una prueba adicional actualiza una base v14 real y verifica UUID/código AB, CSV con preview y respaldo legado. CI mantiene syntax, integrity, unit, browser, institutional, concurrency/cancel-in-progress sin continue-on-error.
