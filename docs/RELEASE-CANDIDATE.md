# Release Candidate 1 — cierre técnico pre-piloto

Versión: **0.1.0-rc.1** · Fecha: **10 de octubre de 2026** · Assets: `20261010-rc1`.
Base revisada: `1132b3c8d9b03e71e1cc2c70c365a0a51e495f8a` (piloto escolar).

## Alcance congelado

Esta entrega estabiliza el prototipo local existente. Incluye catálogo y búsqueda, incorporación individual, jornada de catalogación, asistencia por fotografías/OCR, Mostrador, préstamos/devoluciones/reservas, Mi biblioteca, guardados, perfiles y permisos, inventario y estado físico, avisos, calidad de datos, preparación y piloto, etiquetas, respaldo, importación Aguapey/MARC y cooperación local.

No incorpora backend, sincronización, autenticación real, servicios pagos ni telemetría externa. Las invitaciones y perfiles son simulaciones locales; no constituyen una barrera de seguridad contra quien controla el navegador. Una escuela debe trabajar en un dispositivo/perfil controlado por su responsable.

## Correcciones de cierre

- Validación pura de institución, códigos/identidades de ejemplares, secuencia AB, obras/ediciones, fotos, ubicaciones, inventarios, jornadas y referencias de cooperación. Los errores de un respaldo actual se detectan antes de normalizar o escribir; los identificadores históricos que no son UUID se informan y conservan.
- Restaurar conserva la fecha de modificación bibliográfica. La prueba exporta, vacía el catálogo de prueba, restaura y compara todos los almacenes; la auditoría conserva sus registros originales y agrega el evento de restauración.
- No se pueden eliminar/dar de baja ejemplares incluidos en un inventario pendiente. Una ubicación usada por un inventario abierto también queda protegida; su eliminación pide confirmación.
- Inicio deja de calcular comparaciones de duplicados para el resumen de preparación. Ese análisis sigue disponible en Calidad. La lectura de préstamos y reservas comparte una sola instantánea.
- Títulos de pestaña acordes con el encabezado de cada pantalla; vocabulario de ejemplares; fuentes locales Inter/Lora e identidad visual conservadas.
- MARC vacío y MARC-8 reciben un rechazo claro. Importar UTF-8 conserva 852/859 y pasa por vista previa, cola y confirmación; reimportar no duplica ejemplares del mismo origen.
- Una versión de caché para HTML, hojas de estilo y módulos. El control de integridad rechaza versiones mezcladas también en ambos HTML.
- Pruebas separadas en lógica, smoke, flujos y motor OCR. Harness aislado sin servidor externo; OCR usa su propio servidor efímero para workers. CI conserva fallos y evidencia, cancela ejecuciones reemplazadas y reutiliza la descarga de Chromium compatible con Playwright fijado.

## Cómo reproducir QA

Con Node 22 o posterior:

```sh
npm run verify
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install --with-deps chromium
```

Configurar `BROWSER_CHANNEL=chromium` y ejecutar:

```sh
npm run test:browser-smoke
npm run test:browser-flows
npm run test:browser-ocr
```

En Windows con Edge instalado puede omitirse `BROWSER_CHANNEL`. Las pruebas crean perfiles vacíos y datos sintéticos, sin abrir el catálogo personal. Las capturas y mediciones se guardan en `qa/` (ignorado por Git); CI las adjunta como artefacto por siete días. No hay esperas fijas para disimular carreras. El límite de 15 segundos por ruta de volumen es una alarma amplia de regresión, no una promesa de velocidad en teléfonos.

La matriz recorre las rutas solicitadas y `asistencia`/`guardados` en 320, 390, 768 y 1440 px, claro/oscuro; la suite escolar comprueba las rutas bajo Biblioteca, Autoridad, Docente, Personal y Lector. Los flujos adicionales cubren registro, bienvenida, fichas, edición, ejemplar, vistas personales y las subrutas de jornadas.

La prueba de volumen usa 1.500 materiales y ejemplares, inventario de 1.500 y cola de 300 capturas, incluyendo recarga. Medición local inicial tras la corrección: Inicio 1.108 ms; catálogo 1.246 ms; Mostrador 1.249 ms; jornada 1.387 ms; inventario 1.215 ms; búsqueda 402 ms. Incluye carga de página y almacenamiento en Edge de escritorio; no representa hardware escolar.

## Evidencia y checklist

Las casillas representan pruebas reproducidas, no una certificación general. Para aceptar una revisión distinta, volver a ejecutar las pruebas y comprobar su SHA en Actions.

- [x] CI verde del cierre de código `81b29907d86e888b83b5961924b9a49c7a6c8869`: [Tests, ejecución 38091571716](https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38091571716), primer intento, lógica y navegador completos. La revisión posterior solo registra esta evidencia; comprobar también su SHA en [Tests en main](https://github.com/SanLean17/AsistenteBibliotecario/actions/workflows/tests.yml?query=branch%3Amain).
- [x] [Publicación de RC1](https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38091571258) correcta; navegador vacío sobre el sitio publicado confirmó assets `20261010-rc1`, Inicio, título y alternativa manual de cámara.
- [x] Sin excepciones críticas de JavaScript en los flujos ejecutados (`ui-helpers.cjs`, `finish`).
- [x] Rutas principales y títulos: `rc1-browser.cjs`, `school-pilot-browser.cjs`.
- [x] Roles, hash directo, permisos temporales y vencidos: `reader-browser.cjs`, `access-browser.cjs`, pruebas de acceso/dominio.
- [x] Respaldo completo, rechazo sin escrituras parciales y secuencia AB: `rc1-browser.cjs`, `school-pilot-browser.cjs`.
- [x] Mobile 320/390, tablet 768, desktop 1440 y claro/oscuro: matriz RC1, lectura, avisos, jornada y piloto.
- [x] Mostrador, préstamo concurrente, devolución y códigos inexistentes: `desk-browser.cjs`, `rc1-browser.cjs`, circulación/dominio.
- [x] Jornada, doble envío, revisión, selección y etiquetas: `cataloging-browser.cjs`; 300 capturas y recarga en RC1.
- [x] OCR: carga diferida, decisión humana, índice, múltiples ISBN, cancelación y motor real: `assistance-browser.cjs`, `ocr-engine-browser.cjs`, `assistance.test.js`.
- [x] Docente/Lector: buscar, guardar, reservar, préstamos propios y extensión: `reader-browser.cjs`.
- [x] Inventario: zona antes/después, continuidad, cierre sin declarar pérdidas y protección de borrados: `inventory-dual-browser.cjs`, `rc1-browser.cjs`, `inventory.test.js`.
- [x] Piloto: activación/cierre, observaciones, privacidad, informe y recuperación: `school-pilot-browser.cjs`.
- [x] Aguapey UTF-8, campos locales, preview y duplicados: `marc.test.js`, `import-browser.cjs`, `cataloging.test.js`.
- [x] Etiquetas: QR/CODE128, selección y medio de impresión: `cataloging-browser.cjs`, `holding-identity-browser.cjs`.
- [x] Migración IndexedDB v1 → v11 sin perder identidades históricas: `migration-browser.cjs`; respaldos v4/v5: suite escolar.
- [x] Accesibilidad básica: controles con nombres/labels, títulos, diálogo de borrado con foco en Cancelar y Escape. No equivale a auditoría WCAG completa.

## Respaldo e incidencias durante el piloto

Antes de comenzar, antes de importar/borrar/corregir en lote y al terminar cada jornada: **Configuración → Exportar respaldo**. Comprobar que el archivo existe y guardarlo donde decida la institución. No hay respaldo automático. Para verificar sin escribir: **Piloto → Verificar archivo/importar**, revisar la vista previa y cancelar. La restauración completa reemplaza los datos de esa institución; requiere cerrar préstamos/reservas pendientes. Hacer ensayos de restauración en un perfil vacío separado.

En **Piloto escolar → Registrar observación**, describir pantalla, acción, resultado esperado y resultado observado, sin nombres de estudiantes ni otros datos personales. Las observaciones quedan locales. El informe exportado contiene conteos y agrupaciones, no el texto privado de las observaciones. Un respaldo completo sí contiene datos personales: la escuela decide su custodia.

Si algo sale mal: no borrar datos del navegador, intentar exportar, registrar la incidencia, recargar y comprobar la operación antes de repetirla. Consultar [protocolo del piloto](PILOTO.md).

## Limitaciones conocidas y prueba física pendiente

- Datos por navegador/dispositivo. Sin login real, envío de invitaciones, sincronización ni cooperación en línea. Los respaldos son copias transferidas manualmente.
- La aplicación ya cargada continúa con operaciones locales sin conexión. El arranque desde cero offline no está garantizado; el motor OCR necesita cargar sus archivos locales. Las consultas bibliográficas y tapas externas necesitan red; ante fallos, 429 o timeout se mantiene la carga manual.
- Pruebas móviles mediante emulación. Cámara física, lector USB real, teclado virtual iOS/Android, impresión y legibilidad en papel deben verificarse en la escuela. El test OCR usa una imagen sintética; no prueba calidad de fotografías reales deterioradas.
- Accesibilidad básica automatizada y estilos de foco disponibles; pendiente evaluación con lector de pantalla y contraste exhaustivo de todos los estados.
- Calidad de datos todavía compara posibles duplicados por pares: puede tardar en catálogos grandes. No se ejecuta esa comparación al abrir Inicio. El catálogo representa todos los resultados; no promete rendimiento ilimitado ni se agregó paginación en este cierre.
- MARC-8 y exportación MARC/ISO hacia Aguapey no disponibles. Fixtures simulados, no certificación sobre todas las exportaciones de escuelas.
- Referencias históricas a materiales/ejemplares retirados se conservan y pueden generar advertencias. No se reconstruye ni autocorrige su bibliografía.
- IndexedDB sigue en versión 11 y respaldo en formato 5. No se agregaron almacenes ni se borran datos durante upgrade. El almacenamiento puede fallar o ser eliminado por el navegador; conservar respaldos fuera del dispositivo sigue siendo necesario.

La aceptación operativa final exige un ensayo con materiales, cámara/lector e impresora reales en el equipo elegido por la escuela.
