# Matriz de regresión V2

Mobile: 320/390; intermedios: 768/1024; desktop: 1440. `audit-v2-browser` recorre 35 entradas principales en los cinco tamaños y ambos temas, más 19 rutas de detalle en 320. Los flujos complementarios ejercitan estados con datos, vacíos, confirmaciones, rechazos y recuperación. No cada combinación posible de datos/estado se prueba en cada tamaño.

| Función | Rol | Mobile / desktop | Offline | Backup | Test asociado |
|---|---|---|---|---|---|
| Ingreso y responsable | Biblioteca / Autoridad | Sí / sí | Flujo local | Restauración inicial | entry-browser, entry.test |
| Ciclos, cursos y suplencias | Autoridad / Biblioteca | Sí / sí | Local | Incluido | organization*, audit-v2.simulation |
| Roles, permisos, límites y expiración | Todos | Sí / sí | Local | Incluido | access*, audit-v2-browser, audit-v2.simulation |
| Catálogo, obra/edición, AB, fotos | Biblioteca | Sí / sí | Sí | Comparación de almacenes | holding-identity*, rc1-browser, audit-v2-storage-browser |
| Búsqueda 10k, paginación, 20k lógica | Todos | Sí / sí | Sí | Catálogo | field-volume-browser, field-scale, audit-v2.simulation |
| Jornada, 100 capturas, equivalencias y lote | Biblioteca | Sí / sí | Cola local | Incluido | cataloging.test, cataloging-browser |
| OCR, fotos y confirmación humana | Biblioteca | Sí / sí | Motor local preparado | Incluido | assistance*, ocr-engine-browser, camera-navigation |
| Mostrador, 200 operaciones, doble envío | Biblioteca | Sí / sí | Sí | Historial | desk*, daily-operations, field-volume-browser |
| Reservas y renovación | Docente / Lector / Biblioteca | Sí / sí | Sí | Incluido | reader*, teaching*, audit-v2.simulation |
| Inventario, ubicación, no pérdida automática | Biblioteca | Sí / sí | Sí | Incluido | inventory-dual*, audit-v2.simulation, field-offline-browser |
| Estado físico y atención | Biblioteca | Sí / sí | Local | Incluido | local-domain, daily-operations, pilot-browser |
| Proyectos/listas/experiencias | Docente / Biblioteca | Sí / sí | Ruta y comandos locales | 7 almacenes | teaching*, field-offline-browser |
| Hemeroteca, número y artículo | Biblioteca / Docente | Sí / sí | Ruta local | Incluido | serials.test, hemeroteca-browser |
| Migración CSV/MARC y legado | Biblioteca | Sí / sí | Local | Integridad posterior | migration*, import-browser, audit-v2.simulation |
| Red Escolar y cooperación | Biblioteca | Sí / sí | Snapshot ya importado | Incluido | federation*, audit-v2.simulation |
| Analítica e historial | Biblioteca / Autoridad; propios por perfil | Sí / sí | Local | Derivación | institutional-analytics, analytics-browser, audit-v2.simulation |
| Backup corrupto / restauración grande | Gestión autorizada | Sí / sí | Sí | 42 almacenes; 2k materiales | audit-v2-storage-browser, field-volume-browser, entry-browser |
| Upgrade DB | Gestión | Prueba de almacenamiento | Local | IDs conservados | rc1-browser, organization-migration-browser |
| Ayuda, guías, impresión | Todos según perfil | Sí / sí | Sí | Sin datos operativos propios | help.test, help-browser |
| Diagnóstico y piloto | Gestión | Sí / sí | Local | Informe sin catálogo/personas | school-pilot*, field-school-browser, audit-v2-browser |
| XSS, URL peligrosa, CSV, aislamiento | Todos | DOM / lógica | Local | Rechazos sin escritura | field-scale.test, field-volume-browser, federation*, access* |
| Impresión | Biblioteca / Docente / Autoridad | DOM de impresión | Local | No aplica | field-school-browser, teaching-browser, help-browser, analytics-browser |

## Ejecución y evidencias

- `npm run check`: referencias, versiones, documentación generada y manifiesto offline.
- `npm test`: regresión lógica, dominio, seguridad y escala existente.
- `npm run test:audit`: secuencia escolar de 30 días, temporadas, aislamiento, corrupción y escala 2k/10k/20k.
- `npm run test:shard -- core|circulation|cataloging|institutional|interoperability|field`: navegador Chromium/Edge aislado. Cada script corre una sola vez por matriz.
- `npm run test:shard -- compatibility`: recorrido compacto en Firefox y WebKit mediante `TEST_ENGINE`.
- `qa/audit-v2-logical.json`, `qa/audit-v2-browser.json`, `qa/audit-v2-storage.json` y evidencias `field-*` se generan durante la ejecución; nunca contienen información real de una escuela.

El listener común hace fallar por `pageerror` (incluidas promesas sin manejar) y `console.error`. Solo exceptúa mensajes del navegador `Failed to load resource` por corte de red intencional o proveedores Google/OpenLibrary controlados; no exceptúa errores de código de la app. Las pruebas offline verifican primero que una petición no cacheada falle de verdad.
