# Estado de FIELD PILOT V1

Versión **0.2.0-field.1** · 11 de octubre de 2026. Base publicada al comenzar: RC1 `a77cb37`, Tests y Pages verdes. Esta hoja registra evidencia; no reemplaza la prueba con personas en la escuela.

## Validación local

| Comprobación | Evidencia obtenida |
| --- | --- |
| Sintaxis, referencias y versiones | Checker de módulos y generación reproducible de worker; LF explícito para Windows/Linux; checksums OCR intactos |
| Dominio rápido y escala | 188 pruebas sin fallos; búsqueda indexada equivalente, integridad de 10.000 materiales, búsqueda entre 1.000 personas, 300 capturas y formatos de respaldo 1–5 |
| Rutas y acceso | 25 rutas × 4 tamaños × 2 temas (200 combinaciones); Biblioteca, Autoridad, Docente, Personal, Lector, permisos temporales/revocación y entrada manual por hash |
| Flujos amplios | 13 suites: preparación/piloto, avisos, Mostrador, Docente/Lector, jornada, fotografía, cooperación, inventario, migración, identidad, acceso e importación |
| Apertura offline | Pestaña nueva con navegador sin red; catálogo, circulación, Mi biblioteca, jornada, inventario, estado físico, etiquetas y configuración |
| Actualizaciones | A→B conserva materiales, préstamos e inventario; otras pestañas impiden actualización explícita; C incompleta se rechaza y B continúa offline |
| Respaldo/restore | Roundtrip de todos los stores en smoke; roundtrip mediano de 2.000 materiales; importaciones inválidas no modifican estado; excepción de transacción revierte todo |
| Mostrador prolongado | 100 préstamos + 100 devoluciones; doble submit, navegación durante guardado y recarga inmediata; sin duplicar préstamo |
| Jornada | 300 capturas persistentes y repetidas; selección, lote, reanudación, idempotencia, edición existente/nueva y etiquetas en suites de dominio/navegador |
| OCR | Motor local real y cancelación en suite separada; fotos claras/borrosas/giradas/bajo contraste con salida controlada para revisar propuestas; múltiples ISBN/índice/diario sin aplicación automática |
| Escuela de principio a fin | Institución/persona, alta manual, AB, préstamo/devolución por formularios, Docente guarda/reserva, Mi biblioteca, inventario, etiquetas y descargas reales |
| Impresión | A4 en CSS, sin navegación, bloques no partidos; QR y Code128 realmente decodificados; capturas de etiquetas y checklist revisadas |
| Seguridad local/privacidad | HTML de campos inerte, protocolos inseguros y JSON malicioso rechazados; diagnóstico por lista cerrada sin nombres/títulos/códigos; sin envío automático |
| Accesibilidad | Nombres de controles, foco/diálogos y teclado en suites; 320/390/768/1440, light/dark, texto grande y movimiento reducido; no certificación AA |

Las salidas y capturas están en `qa/` durante la ejecución y se preservan como artefacto `field-pilot-evidence` de CI durante siete días. No contienen datos de la escuela: se generan con fixtures descartables. Las pruebas no tocan perfiles reales del navegador.

## Mediciones de diagnóstico

Windows/Edge, datos sintéticos, 11 de octubre. Incluyen variabilidad del equipo; los límites de CI son amplios, no objetivos de milisegundos.

| Escenario | Resultado local |
| --- | --- |
| 10.000 materiales / 15.000 ejemplares / 1.000 personas / 4.000 préstamos históricos | Apertura de rutas medidas: 3,2–3,8 s, incluyendo recarga y lectura inicial |
| Búsqueda con 5.000 coincidencias | 191 ms hasta resultados; solo 48 tarjetas en DOM |
| Respaldo mediano de 2.000 materiales | 6.618.090 bytes; exportación 67 ms; restauración 393 ms; segundo roundtrip 317 ms |
| 200 operaciones consecutivas sobre fixture pequeño | Aproximadamente 3,5 s para las transacciones, sin simular tiempo humano |
| Transacción sin cambios | Cero escrituras y cero borrados |
| Merge puro de 10.000 materiales, antes/después | Aproximadamente 2.054→194 ms en la medición comparativa del 10 de octubre |

Se conserva lectura completa del estado para mutaciones; el pico de memoria no se midió con un profiler en teléfonos físicos. El límite de importación de 50 MB puede alcanzarse con muchas fotos aunque el número de materiales sea menor.

## Navegadores y límites conocidos

Chromium/Edge tiene cobertura amplia. WebKit pasó el smoke compacto local; Firefox local Windows no pudo iniciar el binario descargado (`spawn UNKNOWN`), por lo que se valida el smoke compacto en Linux/CI. No se presenta WebKit emulado como prueba de Safari en un iPhone físico.

Quedan para la escuela: cámara Android/iPhone, lector USB físico, teclado virtual, hoja impresa real, cierre/suspensión del sistema operativo y observación durante varios días. No se provocó corrupción artificial de disco ni apagado físico durante una migración. Sí se comprobaron rollback atómico, migración representativa desde IndexedDB v1, referencias e identidades y reapertura tras operaciones.

OCR pesado no forma parte de la precarga offline; su disponibilidad sin red no está garantizada. Su precisión en imágenes deficientes no se deduce de los fixtures de salida controlada. Calidad de datos informa expresamente cuando la revisión de duplicados es parcial. El listado general de ejemplares todavía puede ser largo. Los permisos locales son organización de uso, no autenticación; quien controla el navegador puede acceder a sus datos. No hay sincronización, mensajería ni cooperación en línea.

Se conservaron módulos y scripts históricos cuya eliminación no era necesaria para estabilizar el producto. El runner de CI es la lista de suites vigentes. No se hizo una reescritura general ni se retiraron pruebas para conseguir verde.

## Cierre de publicación

La evidencia del commit publicado y sus ejecuciones de Tests/Pages se agrega después de verificarlas. Hasta entonces, esta sección no certifica una release publicada.

- [x] Dominio y escala locales aprobados.
- [x] Offline, actualización, volumen, recuperación y recorrido escolar locales aprobados.
- [x] Manuales por rol, protocolo, privacidad, problemas y lista imprimible disponibles.
- [ ] Tests del commit final completamente verdes, incluidos Firefox/WebKit compactos.
- [ ] Pages del commit final verde y smoke de la publicación verificado.

Recomendación funcional: apta para **piloto controlado**, con equipo principal, respaldo inicial/final, responsable y registro alternativo. No ampliar a operación institucional exclusiva antes de validar los dispositivos y completar el protocolo de [cinco días](GUIA-PILOTO-ESCUELA.md).
