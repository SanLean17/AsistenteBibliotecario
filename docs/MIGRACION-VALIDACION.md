# Evidencia de Migration Center V1

Versión `0.3.0-migration.1`, 11 de octubre de 2026. Base verificada: `563a6f56043fe4a414a390ad87dd8e2d22a41e5a`, con Tests y Pages exitosos antes de implementar. No se agregaron workflows ni excepciones a fallos.

## Verificación local

- Sintaxis de módulos, scripts y tests; integridad de referencias; versión de caché `20261011-migration1` y worker generado reproduciblemente.
- 202 pruebas unitarias: parser CSV, delimitadores, encabezados, UTF-8/Windows-1252, mapeo, columnas ignoradas, ISBN equivalentes, conflictos, inventarios, CSV seguro y fixtures MARC.
- Planes de 100, 2.000 y 10.000 filas. Importación de dominio de 10.000 registros con 10.000 códigos AB únicos y secuencia final 10.001. Pruebas con presupuestos amplios, sin depender de milisegundos exactos.
- Navegador Edge en contextos descartables: carga real de CSV, preview sin escritura, preset, decisiones, commit, catálogo/ejemplares, descargas, selección de etiquetas por ubicación y 10.000 filas paginadas.
- Rollback real de IndexedDB tras conflicto de inventario en una fila posterior; catálogo, ajustes, auditoría e historial sin cambios parciales. Rechazo de snapshot vencido, reintento idempotente y conservación del historial en backup/restore.
- Responsive de revisión 320/390/768/1440, light/dark, capturas en `qa/migration-*.png` y sin desbordes. Ruta nueva incluida en la matriz general de 26 rutas y controles etiquetados.
- Suites generales de flujos, rutas, Field Pilot (offline/volumen/recorrido escolar) y OCR real aprobadas localmente. El Centro de Migración abre también en una pestaña nueva sin red después de preparar la aplicación.

## Alcance de la evidencia

Fixtures sintéticos y perfiles de pruebas, sin datos de ninguna escuela. No se verificó una migración institucional real, impresión física de etiquetas ni rendimiento en teléfonos antiguos. La transacción prepara el lote en memoria; máximo 20 MB/10.000 registros/30.000 ejemplares. La similitud tiene presupuesto explícito y los resultados parciales requieren decisión.

No se habilitaron undo parcial, importación de personas, XLSX nativo, conversión MARC-8 ni exportación MARC. No se afirma interoperabilidad bidireccional con Aguapey. Se conserva el flujo individual y el importador MARC por Jornada.

El estado del commit publicado se verifica en [GitHub Actions](https://github.com/SanLean17/AsistenteBibliotecario/actions?query=branch%3Amain). La evidencia local no sustituye la finalización exitosa de ese CI ni las comprobaciones de Pages.
