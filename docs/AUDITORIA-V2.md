# Auditoría integral V2 — Field Pilot V2

Versión interna `0.11.0-field.2`, 15 de octubre de 2026. Validación y correcciones de continuidad de la aplicación existente. Sin backend, telemetría, servicios de soporte ni nuevas funciones grandes.

## Base y método

Se verificó `main` en `7437420d0d88b2c21fcb8251a304ddcec05daa46`: Tests [38818265425](https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38818265425) y Pages [38818264977](https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38818264977) completados correctamente. V2 exige volver a verificar ambos para el SHA final; el verde de esta base no se reutiliza como evidencia del release nuevo.

Los tests usan contextos de navegador nuevos y datos ficticios identificados como QA. El reloj controlado pertenece al test; no se cambia la hora del equipo. No se siembran datos en la aplicación publicada. La integridad impide importar fixtures desde el código de ejecución.

## Dataset y secuencia

`tests/fixtures/school-v2.js` construye una institución de 2027 con 7 cursos (1°A a 7°A), 1 Autoridad, 2 Biblioteca, 15 Docentes, 5 Personal y 200 Lectores: 223 personas. Crea 2.000 materiales y 4.000 ejemplares, incluyendo revistas, diarios, artículos dentro de números, documentos, libros, antologías, ISBN10/13 equivalentes, materiales sin ISBN, temas, ubicaciones, estados físicos y coincidencias controladas. Los ISBN sintéticos de captura no representan publicaciones consultadas en Internet.

La secuencia ejecuta comandos reales del dominio durante 30 días: búsquedas, 100 préstamos diarios, 10 reservas diarias, devoluciones, una jornada diaria y proyectos/experiencias de los 15 docentes. Resultado: 3.000 préstamos de abril más una renovación completa en mayo, 300 reservas retiradas, 30 jornadas y 15 experiencias aprobadas. Se comprueban cronología, identidades y métricas exactas de préstamos/devoluciones/reservas/atrasos, sin rankings personales.

Las temporadas ejercitan inventario en junio, suplencia y vencimiento en julio, migración en agosto, cooperación en septiembre, analítica con corte en octubre y cierre/preparación del ciclo 2028 en diciembre. Los proyectos se archivan explícitamente y se conserva el historial de circulación. Tres instituciones prueban aislamiento y el mismo AB local sin colisión global.

El roundtrip grande añade una migración CSV y un snapshot con cooperación prepared → agreed → received → returned. Restaura 2.001 materiales y 3.001 préstamos en una aplicación vacía, usando preview/confirmación reales; compara los 42 almacenes completos, con la excepción explícita del nuevo evento de auditoría de restauración. Las claves ausentes en JSON se comparan después de serializar, igual que el archivo real. Se prueban seis archivos corruptos contra el estado persistido, además de JSON inválido en el flujo de ingreso.

## Hallazgos corregidos

| Hallazgo reproducido | Corrección | Regresión |
|---|---|---|
| Buscar «artículo» infería tipo artículo y omitía números contenedores | Incluir contenedores con artículos cuando el tipo es inferido; conservar filtro explícito | audit-v2.simulation / hemeroteca-browser |
| Calidad omitía fechas inválidas, contenido roto y algunas referencias de ejemplar/préstamo | Compartir detección pura de referencias con recuperación | audit-v2.simulation |
| Diagnóstico mostraba la pantalla de Calidad en vez del chequeo de almacenamiento | Mostrar chequeo existente de DB, versión, stores, integridad, espacio, responsable, backup y service worker | school-pilot.test / audit-v2-browser |
| Hash desconocido se mostraba como Inicio | Pantalla explícita de ruta no encontrada y regreso | audit-v2-browser |
| Restaurar material migrado perdía migrationId | Preservar identificador acotado durante validación bibliográfica | audit-v2-storage-browser |
| Alta por migración reemplazaba el ID después de crear la referencia de asistencia | Conservar el ID nuevo generado por el validador | audit-v2.simulation / audit-v2-storage-browser |
| README seguía presentando V1 como versión actual | Encabezado y enlaces a evidencia V2; historial conservado | Revisión documental |

Se corrigieron también los instrumentos de QA: comparación de JSON real, fixture con autor/autores coherentes, selección de diagnóstico por etiqueta y mock de cámara solo en contexto con mediaDevices. No se quitaron verificaciones para conseguir verde.

## Cobertura y medidas

- [Matriz de producto](PRODUCT-MATRIX.md) y [regresión](REGRESSION-MATRIX.md) vinculan capacidades con suites existentes y nuevas.
- Rutas principales: 35 × cinco anchos × dos temas; 19 detalles adicionales en móvil. Cinco perfiles × 33 rutas contrastan autorización con la pantalla resultante; comandos de escalación y permisos vencidos se rechazan por separado.
- Escala lógica de 2k/10k/20k con integridad y búsquedas por acentos, autor, tema, contenido, artículo e identificadores. Navegador hasta 10k, paginación acotada y 200 operaciones de circulación consecutivas. Presupuestos amplios detectan explosiones, no pequeñas diferencias entre equipos.
- Recursos: 20 navegaciones de calentamiento y otras 40 comparadas mediante GC/DOMCounters. Cámara detiene tracks al cerrar/cambiar ruta/ocultar; OCR termina worker al cancelar. Estos tests no reemplazan un perfil de memoria de días en cada dispositivo.
- Offline: reapertura en pestaña nueva, petición no cacheada rechazada, operaciones locales, rutas de proyectos/hemeroteca/ayuda y actualización incompleta rechazada sin perder datos. No se simula el banner como sustituto de bloquear realmente la red.
- Privacidad y seguridad: datos propios por perfil, snapshots por allowlist, exportación de diagnóstico sin fichas/nombres, HTML inerte, URL peligrosas rechazadas y fórmulas CSV neutralizadas. El modo local no es autenticación segura frente al dueño del navegador.
- Impresión: etiquetas y guías en media print; proyectos e informes generan documentos independientes. Falta validación física de papel/impresora, expresamente incluida en la lista de campo.

Los resultados medidos se escriben en `qa/audit-v2-*.json` y `qa/field-*.json`, junto con capturas. Los números de duración deben leerse del artefacto del commit probado, no extrapolarse a hardware escolar. Las suites de navegador se dividen en seis bloques Chromium y compatibilidad compacta Firefox/WebKit. La simulación tiene job propio. No se usa continue-on-error; fail-fast falso permite conocer todos los fallos, pero cualquiera falla el workflow. Se conserva concurrency/cancel-in-progress.

## Dependencias y limpieza

No hay dependencias npm de producción. Playwright 1.62.1 está fijado para QA. Vendors locales: ZXing Browser 0.2.1 (MIT, con licencia Apache-2.0 de la biblioteca incluida), JsBarcode 3.12.1 (MIT), qrcode-generator 1.4.4 (MIT), Tesseract.js 6.0.1/core 6.0.0 y tessdata_fast 4.1.0 (licencias incluidas). Se revisaron sus usos en cámara, etiquetas y OCR, sin actualizar versiones mayores. OCR ya tiene manifiesto y hashes; se agregó control de contenido/licencias para los otros vendors (texto UTF-8 con saltos de línea LF, independiente del checkout Windows/Linux). Esto detecta cambios accidentales y no equivale a un escaneo de vulnerabilidades upstream.

Se revisaron imports/referencias mediante integridad, documentación generada y manifiesto offline. Los antiguos runners se conservan como comandos compatibles; la matriz nueva prueba que no pierde ni repite sus escenarios. Las esperas visuales fijas se reemplazaron por condiciones de fuentes, transiciones finitas y pintado. Los documentos históricos se conservan identificados como tales. No se borraron CSS o archivos por sospecha de desuso: los selectores y cargas dinámicas requieren evidencia antes de eliminar.

## Riesgos y recomendación

Piloto supervisado en un equipo principal, con backup verificado, repertorio inicial cercano al dataset de 2k y prueba presencial de cámara, papel, teclado y conexión. No habilitar dependencia operativa exclusiva sin un procedimiento de contingencia y restauración ensayada. Los límites de tamaño, acceso local, hardware y servicios externos están detallados en [KNOWN-ISSUES](KNOWN-ISSUES.md).

La aprobación de esta versión exige Tests y Pages verdes para el mismo commit y completar [FIELD-PILOT-V2-CHECKLIST](FIELD-PILOT-V2-CHECKLIST.md). Esta simulación no sustituye treinta días de observación humana en una escuela.
