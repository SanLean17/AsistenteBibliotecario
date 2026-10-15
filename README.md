# Asistente Bibliotecario

**FIELD PILOT V1 · 0.2.0-field.1**. Aplicación local para bibliotecas escolares argentinas. Preparada para una prueba controlada; no es una plataforma con cuentas ni sincronización.

[Abrir aplicación](https://sanlean.com.ar/AsistenteBibliotecario/app.html#inicio) · [Sitio informativo](https://sanlean.com.ar/AsistenteBibliotecario/) · [Estado y evidencia](docs/FIELD-PILOT-STATUS.md) · [Notas de versión](RELEASE_NOTES.md).

## Qué incluye

Catálogo y búsqueda por título, autoría, temas y contenidos; alta manual/ISBN; jornada de catalogación; asistencia por fotografía con propuestas que requieren confirmación; ejemplares con códigos AB y fotos físicas; Mostrador, préstamos, devoluciones y reservas; Mi biblioteca y guardados; personas, roles y permisos locales; inventario, ubicaciones y estado físico; avisos, calidad, planificación y cooperación local; etiquetas QR/Code128; importación Aguapey/MARC UTF-8; respaldos y piloto con observaciones/informe.

La apertura sin conexión se prepara al visitar la aplicación con red. Esperar el aviso de preparación completa y comprobar una reapertura sin internet. Las fuentes bibliográficas y portadas externas pueden no estar disponibles. Los datos viven en este navegador y dispositivo; exportar un respaldo al inicio y cierre de cada jornada. Elegir un equipo principal evita catálogos divergentes.

## Para la escuela

- [Guía de Biblioteca](docs/GUIA-BIBLIOTECA.md)
- [Guía de Docente/Lector](docs/GUIA-DOCENTE.md)
- [Guía de Autoridad Institucional](docs/GUIA-AUTORIDAD.md)
- [Piloto de cinco días](docs/GUIA-PILOTO-ESCUELA.md) y [lista imprimible](docs/checklist-piloto.html)
- [Si algo sale mal](docs/SI-ALGO-SALE-MAL.md) y [privacidad](docs/PRIVACIDAD-PILOTO.md)
- [Matriz completa de capacidades y límites](docs/FIELD-PILOT.md)

## Ejecutar y verificar

Node.js 22 o posterior; sin compilación ni backend para operar la aplicación:

```sh
node scripts/serve.mjs
```

Abrir http://127.0.0.1:4173/app.html. También se publica como sitio estático bajo /AsistenteBibliotecario/.

```sh
npm run check
npm test
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium firefox webkit
```

Elegir BROWSER_CHANNEL=chromium para Chromium descargado, o msedge/chrome si están instalados. El valor por defecto local es msedge. Ejecutar:

```sh
npm run test:browser-smoke
npm run test:browser-flows
npm run test:browser-field
npm run test:browser-ocr
node scripts/test-browser.mjs compatibility
```

TEST_ENGINE=firefox o webkit selecciona el motor para el smoke compacto. PLAYWRIGHT_MODULE/NODE_PATH permiten una instalación externa. TEST_BASE_URL se reserva para smoke de publicación. Las suites locales crean su propio harness o servidor efímero; no requieren un servidor externo ya abierto. qa/ conserva diagnósticos/capturas y está excluido de Git. Los fixtures sintéticos de tests/ nunca se cargan en producción.

Después de cambiar assets, actualizar coherentemente la versión visible y de imports y ejecutar node scripts/build-offline.mjs. El checker rechaza un worker desactualizado o archivos OCR alterados. Los assets textuales mantienen LF en Windows/Linux. No editar sw.js a mano: se genera desde scripts/offline-worker.template.js.

## Arquitectura y límites

JavaScript modular sin framework, IndexedDB versión 12, respaldo formato 5. src/storage.js expone el repositorio; storage/indexeddb.js conserva transacciones atómicas y escribe diferencias. Dominio y permisos se comprueban también al ejecutar operaciones. El worker solo conserva archivos de la release; no guarda respuestas bibliográficas ni toca la base de datos. Inter + Lora locales, paleta y dark mode existentes.

No hay login real, sincronización, analytics, notificaciones externas ni IA nueva. El OCR se ejecuta en el dispositivo con carga diferida; su uso offline no está garantizado. Importación de respaldo limitada a 50 MB y 10.000 materiales; fotos abundantes pueden superar ese tamaño. MARC-8 y exportación MARC no disponibles. El adaptador experimental server/bn-provider.mjs preexistente no está activado en Pages ni forma parte de este despliegue.

[Arquitectura e historial](docs/ARCHITECTURE.md) · [Fuentes bibliográficas](docs/BIBLIOGRAPHIC-PROVIDERS.md) · [Licencias de terceros](THIRD_PARTY_NOTICES.md) · [Cierre RC1 histórico](docs/RELEASE-CANDIDATE.md).
## Migration Center V1

Las escuelas con catálogo previo pueden usar **Importar / exportar → Centro de Migración** para Aguapey/MARC UTF-8, CSV de Excel/Sheets, TSV o JSON propio. Análisis local, mapeo editable, revisión de duplicados, importación atómica, historial, CSV de salida y etiquetas AB. [Guía paso a paso](docs/MIGRACION.md). No requiere backend ni servicios pagos.

## Red Escolar V1 · simulación local

Biblioteca puede compartir un catálogo mínimo elegido expresamente, cargar archivos de otras escuelas, buscar y comparar ediciones y registrar acuerdos, recepción y devolución. Todo es local: no hay sincronización, envíos ni datos personales remotos. Los ejemplares externos conservan su propietario y no reciben AB propio. [Guía](docs/RED-ESCOLAR.md) · [Contrato y límites](docs/RED-ESCOLAR-CONTRATO.md).

## Centro de ayuda

Abrí **Centro de ayuda** en el menú o [#ayuda](https://sanlean.com.ar/AsistenteBibliotecario/app.html#ayuda). Incluye búsqueda local, guías por perfil, glosario, recorridos opcionales y guías imprimibles. No registra tus búsquedas ni envía consultas a servicios externos. Ver [Centro de ayuda V1](docs/CENTRO-DE-AYUDA.md).
