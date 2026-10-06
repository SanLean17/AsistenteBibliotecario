# Asistente Bibliotecario

Prototipo local para bibliotecas escolares argentinas. El nombre sigue siendo de trabajo.

## Acceso

- Sitio público: https://sanlean.com.ar/AsistenteBibliotecario/
- Aplicación interna: https://sanlean.com.ar/AsistenteBibliotecario/app.html#inicio

La landing explica el producto; la aplicación abre un panel con buscador, catálogo, incorporación, ejemplares y configuración. Los enlaces antiguos con rutas hash siguen funcionando. No se agregó ni modificó CNAME.

## Disponible

- Entrada única por cámara con ZXing multiformato. Si no reconoce el material, reintento, código/enlace o incorporación manual; sin elegir previamente ISBN, ISSN, DOI o QR.
- Consulta en paralelo a Open Library y Google Books, con equivalencia ISBN-10/ISBN-13.
- Combinación de metadatos con procedencia por campo, conflictos y datos originales de fuente.
- Revisión posterior al reconocimiento: tipo de material, datos disponibles, temas, resumen y contenidos; copias físicas solamente cuando corresponden. Libros, revistas, diarios, artículos, documentos, producciones escolares y recursos digitales.
- Búsqueda en título, autor, temas, sinónimos acotados, descripción y contenidos; sin inferencias de edad/grado ni IA.
- Fichas compactas, portada ampliable, fotos independientes por ejemplar, inventario y edición individual de ubicación/estado.
- Confirmaciones propias en zonas de peligro: borrar foto, reemplazar foto, eliminar ejemplar, reducir cantidad, eliminar registro, vaciar catálogo e importar coincidencias.
- IndexedDB, exportación/importación JSON con fotografías, tema claro/oscuro y controles móviles de al menos 16 px.

El catálogo conserva la misma base IndexedDB de versiones anteriores. La landing no abre esa base. La información no se sincroniza entre dispositivos y no existen cuentas reales; la circulación y los permisos funcionan en este dispositivo.

## Arquitectura y fuentes

- [Arquitectura, modelo y roadmap](docs/ARCHITECTURE.md): separación obra/edición/ejemplar, institución/biblioteca/colección, contrato de almacenamiento y módulos futuros.
- [Investigación y adaptadores bibliográficos](docs/BIBLIOGRAPHIC-PROVIDERS.md): BN Mariano Moreno, BNM, ISBN Argentina y proveedores comerciales futuros.
- `src/providers/`: contrato/registro de fuentes, consultas HTTPS y normalizadores MARC21.
- `server/bn-provider.mjs`: adaptador opcional Node + YAZ para la BN. Probado con datos controlados, no activado en Pages. La conexión TCP al destino oficial fue comprobada; todavía no se verificó recuperación Z39.50 real.
- `src/storage.js`: fachada de repositorio; `src/storage/indexeddb.js`: implementación actual.

No se agrega Supabase, infraestructura paga ni scraping. Las fuentes argentinas son diferentes y se muestran como consultas externas. Las funciones futuras —reservas, préstamos, usuarios, estadísticas de circulación, OCR/IA y red escolar— se indican expresamente como roadmap.

## Identidad

Sistema editorial con tipografía serif/display y sans, aire, bordes finos y grillas. Colores base: `#51C6FB`, `#3981F7`, `#EBF3FF`, `#0A112F`, con derivados neutros. `theme.css` comparte tokens y controles; `landing.css` y `design.css` separan composición pública y espacio de trabajo.

## Desarrollo y pruebas

```sh
node scripts/serve.mjs
node --test tests/*.test.js
```

Con Playwright disponible, en otra terminal:

```sh
node tests/browser.cjs
node tests/isbn-browser.cjs
node tests/photos-browser.cjs
node tests/migration-browser.cjs
node tests/editorial-browser.cjs
node tests/navigation-browser.cjs
```

`PLAYWRIGHT_MODULE` puede señalar una instalación externa. `BROWSER_CHANNEL=chrome` selecciona Chrome (por defecto Edge); `TEST_ENGINE=webkit` usa WebKit/iPhone. `TEST_BASE_URL` permite probar la publicación. Los tests usan perfiles aislados y respuestas de proveedores controladas; ZXing sí decodifica códigos reales generados para las pruebas. `qa/` queda fuera de Git.

La regresión de guardado tiene prueba de ISBN → ficha → datos físicos → guardar → recargar → persistencia. El formulario se identifica por `matches`, porque un control oculto `name="id"` oculta `form.id`. Los fallos de validación o almacenamiento se muestran sin recargar ni perder el formulario.

### Pruebas de circulación local

- `node tests/local-browser.cjs`: personas, permisos, préstamos/devoluciones, reservas, ubicaciones, QR, concurrencia, respaldo y responsive.
- `node tests/migration-circulation.cjs`: migración de v3 preservando fotos, préstamos y usuarios.
- `node tests/import-browser.cjs`: MARC UTF-8, 852/859, duplicados y auditoría.

Elegí el **perfil local** desde el menú. El perfil inicial Responsable local permite dar de alta personas y conceder permisos. No hay autenticación real: todos los datos y perfiles pertenecen exclusivamente a este navegador. Exportá un respaldo completo antes de trasladar la biblioteca a otro equipo.

### Reconocer antes de preguntar

`src/recognition.js` clasifica identificadores sin abrir enlaces arbitrarios. Recuperación automática disponible por ISBN; DOI, ISSN y URL se conservan para completar la ficha, sin afirmar que existe un proveedor conectado. Fotografiar una tapa/primera plana para proponer contenidos es futuro y exige confirmación humana.

`node tests/recognition-browser.cjs` verifica cámara primero, ISSN, diario con búsqueda temática, persistencia, QR real, recurso digital sin ejemplares y respaldos.
