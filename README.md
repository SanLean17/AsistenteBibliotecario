# Asistente Bibliotecario

Primera versión de una biblioteca personal y escolar, en español de Argentina. Interfaz mobile-first con inicio, catálogo, búsqueda y fichas. Sin servidor de datos, cuentas ni servicios pagos.

## Probar localmente

Requiere Node.js 20 o posterior. No necesita instalar dependencias para funcionar.

```sh
node scripts/serve.mjs
```

Abrir http://127.0.0.1:4173. Para probar desde un celular, publicar los archivos estáticos en GitHub Pages (Settings → Pages → Deploy from a branch → main → /root). Todas las rutas son relativas y funcionan bajo `/AsistenteBibliotecario/`.

## Funciones disponibles

- Inicio con totales reales de libros, ejemplares y cuentos/capítulos.
- Alta, consulta, edición y eliminación de libros.
- Título, autor, ISBN opcional validado, categoría, editorial, cantidad, ubicación, contenidos y notas.
- Búsqueda sin distinción de acentos por título, autor, ISBN, editorial, ubicación y cuentos/capítulos; filtro por categoría.
- Guardado local con IndexedDB y confirmación después de completar cada escritura.
- Exportación e importación JSON validada y atómica. Importar conserva los libros ajenos al respaldo y actualiza los que tengan el mismo identificador, previa confirmación.
- Cubiertas tipográficas de presentación: no son las portadas originales del libro.
- Navegación móvil y escritorio, etiquetas accesibles, diálogos con teclado y estados vacíos.

El catálogo inicia vacío. Los datos no se envían a GitHub ni se sincronizan entre dispositivos. Borrar los datos del sitio borra el catálogo: exportar respaldos regularmente. Cada dominio, puerto y navegador usa almacenamiento separado. Las fuentes de Google Fonts son opcionales y tienen alternativas locales.

## Estructura y próximos pasos

- `index.html`, `styles.css`: presentación responsive y formularios.
- `src/app.js`: vistas y coordinación de interacciones.
- `src/catalog.js`: validación, búsqueda y formato del respaldo.
- `src/storage.js`: acceso a IndexedDB, separado de la interfaz para evolucionar su esquema.
- `tests/`: verificaciones de lógica y recorridos reales en navegador.

El ISBN se ingresa manualmente; esta versión **no consulta catálogos externos**. Escaneo con cámara, fotografías, recuperación de portadas, asistencia con IA, préstamos, sincronización y PWA offline están pendientes. El campo `cover` queda reservado para referencias futuras; una futura migración deberá almacenar fotos en un almacén independiente y ampliar el respaldo. La incorporación de IA requerirá definir proveedor, costos y confirmación humana de los datos sugeridos; nunca incluir claves privadas en el frontend.

## Verificación

```sh
node --test tests/catalog.test.js
node tests/browser.cjs
```

La prueba de navegador requiere Playwright y Edge instalados. Puede indicarse `PLAYWRIGHT_MODULE` con la ruta al módulo y `BROWSER_CHANNEL=chrome` para Chrome. Comprueba persistencia tras recarga, búsqueda de cuentos con acentos, edición, eliminación, exportación y recuperación, texto HTML tratado como texto, alta móvil y ausencia de desbordamiento horizontal a 320, 390, 740 y 1440 px. Las capturas y datos de prueba se guardan en `qa/`, excluido de Git.
