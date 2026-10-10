# Punto de continuación — FIELD PILOT V1

Nota histórica del punto guardado el 10 de octubre de 2026. El usuario autorizó retomar el 11 de octubre. El estado vigente está en [FIELD-PILOT-STATUS.md](FIELD-PILOT-STATUS.md); los pendientes y resultados que siguen describen exclusivamente el checkpoint original. El pedido íntegro está en `FIELD-PILOT-REQUEST.txt`.

## Base y publicación

- Repositorio local activo: `C:\Users\Lean\.codex\.chatgpt-projects\g-p-6ac0813ca4b881919ec0f923d3fd327b\repo`.
- Base de main/publicación: `a77cb37af99634ea2cb5ce927696c3ef8b54997a` (RC1).
- Última CI de esa base: https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38091980696 — success.
- Pages de esa base: https://github.com/SanLean17/AsistenteBibliotecario/actions/runs/38091980134 — success.
- Este punto se guarda en la rama local `checkpoint/field-pilot-v1`, sin push ni modificación de la versión publicada.
- Versionado de trabajo: package `0.2.0-field.1`, assets `20261010-field1`.
- No backend, sincronización, cuentas reales, servicios pagos ni telemetría. No editar `sources/`.

## Implementado en este punto

- `src/offline.js`, manifest, worker y generador de caché local. Verificación SHA-256 de todos los assets antes de activar; una publicación mezclada/incompleta no sustituye la anterior. No cachea proveedores, respuestas, datos de usuario ni OCR pesado. Recursos locales base: 77 archivos, aproximadamente 2,46 MB sin contar duplicación de claves con/sin versión.
- Aviso de conexión/preparación y actualización solicitada desde Configuración, con guarda de otras pestañas. Nunca recarga silenciosamente una operación. Los fragmentos de `WindowClient.url` resultaron ser una instantánea antigua en Chromium; la guarda de ruta vive en la página y se comunica al worker, que verifica la identidad y cantidad de clientes.
- Catálogo con páginas de 48 resultados; índice explícito por snapshot y espera de 120 ms al escribir; mantiene filtros/página y posición al volver de ficha. Agrupación de circulación por material para disponibilidad.
- Disponibilidad respeta `careLevel=restricted` aunque un dato antiguo diga available.
- Mapas en proyección de personas y merge institucional; comparación antes/después dentro de una sola transacción IndexedDB para escribir solamente registros cambiados, conservando atomicidad y serialización entre pestañas.
- Mostrador: cuenta préstamos de personas en una pasada; evita doble submit del formulario y no cambia de ruta si la persona navegó durante el guardado.
- Calidad: índice de candidatos de duplicados y límite explícito de trabajo (20.000 comparaciones / 500 resultados); avisa cuando es parcial. Incidencias paginadas de a 100.
- Integridad reforzada para préstamos activos duplicados, reservas asignadas, permisos y cooperación. Mapas para referencias. JSON inseguro rechazado antes de modificar estado.
- Respaldo compacto; feedback de preparación; vista previa amplía cantidades (asistencia, observaciones, ubicaciones y cooperación). Diagnóstico exportable por lista cerrada sin nombres, títulos, identificadores ni errores originales.
- Ayuda elimina el texto obsoleto sobre préstamos/personas futuros y muestra versión.
- Guías de Biblioteca, Docente, Autoridad y piloto de cinco días; privacidad; «Si algo sale mal» y checklist HTML imprimible.
- Fixtures exclusivos de QA: pequeño 100/150/20; mediano 2.000/3.000/200/500 préstamos históricos; grande 10.000/15.000/1.000/4.000 históricos. Nunca importados automáticamente por la app.

## Evidencia local ya obtenida

Los archivos detallados permanecen en `qa/` (ignorado por Git y conservado localmente). Las pruebas usan perfiles de navegador descartables.

- 182 pruebas preexistentes de dominio pasaron después de las modificaciones principales (`qa/field-unit.log`).
- 6 pruebas nuevas `tests/field-scale.test.js` pasaron: escala, 300 capturas, duplicados acotados, respaldo hostil, diagnóstico privado, disponibilidad y lectura de formatos v1–v5. Todavía debe correrse el conjunto completo final de 188.
- `scripts/test-browser.mjs smoke`: pasó la matriz RC1 de 25 rutas × 4 anchos × 2 temas, accesibilidad básica, 1.500 materiales, 300 capturas, concurrencia y roundtrip de todos los stores (`qa/field-smoke.log`).
- Las 13 suites `flows` pasaron (`qa/field-flows.log`).
- `tests/field-offline-browser.cjs` pasó apertura en pestaña nueva sin internet, operaciones locales, actualización A→B conservando libros/préstamos/inventario, bloqueo entre pestañas, rechazo de C corrupta y apertura offline de B. **Después de este pase se ajustó la retención de cachés a actual+anterior y recuperación de módulos versionados antiguos; falta repetir esta prueba.**
- `tests/field-volume-browser.cjs` pasó: respaldo mediano 6.618.090 bytes, exportación ~82 ms, restauración ~416 ms, roundtrip ~371 ms; rollback de transacción provocado y cero escrituras en operación sin cambios. 10.000 materiales/15.000 ejemplares: rutas 2,9–3,8 segundos incluyendo apertura fría; búsqueda 5.000 coincidencias ~185 ms. 200 operaciones Mostrador ~2,85 s sobre fixture pequeño; navegación durante submit y persistencia tras recarga; HTML hostil inerte. No son garantías para teléfonos reales.
- `tests/field-school-browser.cjs` pasó: configuración, alta manual real, AB, formularios de préstamo/devolución, Docente guarda/reserva, inventario, descarga real de respaldo y diagnóstico. QR y Code128 de etiquetas se decodificaron con ZXing real. Medios print ocultan navegación; etiquetas no se cortan dentro del bloque. Capturas vistas, sin afirmar prueba de impresora física.
- `tests/assistance-browser.cjs` pasó nuevamente con imágenes generadas claras, borrosas, giradas y de bajo contraste, propuestas controladas, múltiples ISBN y texto de índice largo; comprueba no aplicar ni mezclar fotos físicas. **La salida OCR se simula en esta suite; no demuestra precisión del motor en fotos deficientes.** Motor real y cancelación se verifican por separado y falta repetirlos en este cierre.
- WebKit: pasó `tests/field-cross-browser.cjs` en Windows. Firefox descargado, pero no pudo iniciar (`spawn UNKNOWN`); no marcado aprobado. Ejecutar el smoke compacto de Firefox en CI/Linux. Chromium/Edge tiene cobertura local extensa.
- Benchmark puro antes/después (`qa/field-benchmark-baseline.json` / `indexed.json`): merge de 10.000 materiales ~2.054 ms→194 ms; integridad ~113 ms→26 ms. Búsqueda sin índice ~240 ms; el índice se usa en la UI.

## Pendientes antes de publicar (prioridad)

1. **Resolver finales de línea antes de generar hashes del worker.** Windows usa autocrlf; los SHA de assets locales CRLF pueden diferir de los LF publicados en Linux. `.gitattributes` actualmente solo fija `vendor/ocr-6.0.1/** -text`. Añadir eol=lf para los tipos de texto cacheados y normalizar esos archivos; preservar exactamente los bytes vendorizados OCR y binarios. Regenerar `node scripts/build-offline.mjs`; verificar también desde un checkout limpio para reproducibilidad. No publicar un manifest con hashes de otra representación.
2. Revisar el diff completo. La mayoría de los 70+ archivos cambiados solo hace bump coherente `?v=`. `sw.js` es generado; editar `scripts/offline-worker.template.js` y regenerar, no editarlo a mano.
3. Completar `docs/FIELD-PILOT.md` (matriz de producto/offline/experimental), `docs/FIELD-PILOT-STATUS.md` (evidencia y pendientes), `RELEASE_NOTES.md`, `THIRD_PARTY_NOTICES.md`; actualizar README y `tests/VERIFICATION.md`. README todavía presenta funciones existentes como roadmap. No afirmar pruebas físicas, semanas reales ni auditoría AA formal. Usar los manuales ya creados y la solicitud original como referencia.
4. Licencias inspeccionadas: ZXing Browser 0.2.1 MIT, biblioteca incluida tiene aviso Apache-2.0 en `vendor/ZXING-LIBRARY-LICENSE.txt` (no inventar versión interna no documentada); QR generator 1.4.4 MIT; JsBarcode 3.12.1 MIT; Tesseract.js 6.0.1, core 6.0.0, tessdata_fast español 4.1.0 Apache-2.0; Inter/Lora OFL 1.1 con fuentes y licencias locales.
5. Conectar suites nuevas a `scripts/test-browser.mjs` y CI. `package.json` ya declara `test:browser-field`, pero **todavía no existe el grupo field** en el runner. Incluir field-offline, field-volume, field-school; smoke compacto Firefox/WebKit con instalación única/caché por versión. Mantener unit/syntax/integrity/smoke/flows/OCR sin silenciar errores. Considerar presupuesto 240 s por suite (la suite de volumen local pasó holgadamente).
6. Ejecutar integridad, sintaxis de todos los JS incluido worker, 188 unitarias, smoke, flujos pertinentes tras últimos cambios, offline nuevamente y OCR real. Compacto Firefox en Linux debe quedar comprobado. Revisar dark/light y estado de impresión A4 sin extrapolar a hardware.
7. Revisar la cobertura pedida contra los 41 apartados: algunos ya estaban implementados y cubiertos por RC1; documentar limitaciones, no inventar resultados. No se ha simulado un cierre físico de proceso a mitad de upgrade ni una semana real de uso. OCR pesado no se precachea; necesita descarga inicial y offline posterior no está garantizado para OCR. Respaldo UI sigue limitado a 50 MB / 10.000 materiales; muchas fotos pueden superar ese límite. Sin login real ni sincronización.
8. Agrupar/amendar el checkpoint al terminar (evitar muchos commits), integrar sobre main actualizado sin pisar cambios ajenos, push autorizado por el pedido y verificar **Tests + Pages del commit final verdes**. Comprobar assets y smoke de la publicación. Hasta entonces no declarar FIELD PILOT terminado.

## Herramientas locales

PowerShell en la carpeta repo. Node está disponible. Para Playwright:

```powershell
$env:NODE_PATH='C:\Users\Lean\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node --test tests/*.test.js
node scripts/check-integrity.mjs
node scripts/build-offline.mjs --check
node scripts/test-browser.mjs smoke
node scripts/test-browser.mjs flows
node scripts/test-browser.mjs ocr
node tests/field-offline-browser.cjs
node tests/field-volume-browser.cjs
node tests/field-school-browser.cjs
```

No hace falta localhost externo para las suites: harness de rutas o servidor propio efímero. Ejecutar navegadores aislados con escalación del sandbox (autorizada anteriormente); no usar perfiles reales. `npm` no estaba en PATH; Node y las dependencias bundled sí. Para Firefox/WebKit, `TEST_ENGINE`; por defecto Edge. No dejar esa variable configurada para el resto de suites. La prueba offline siempre abre su propio servidor bajo `/AsistenteBibliotecario/`.

Git no tiene autor global configurado: usar autor del último commit mediante `git -c user.name=... -c user.email=... commit`, sin cambiar configuración global. No hay subagentes autorizados. No actualizar memorias sin pedido explícito.
