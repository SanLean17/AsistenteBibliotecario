# Asistente Bibliotecario

Prototipo de gestión bibliotecaria escolar e institucional para Argentina. La interfaz es mobile-first, funciona también en escritorio y busca modernizar tareas que hoy suelen resolverse con sistemas bibliotecarios tradicionales o carga manual.

## Objetivo

Reducir al mínimo la escritura manual durante la catalogación. El flujo principal es:

1. Escanear o fotografiar el código ISBN de la contratapa.
2. Normalizar automáticamente ISBN-10 / ISBN-13.
3. Consultar fuentes bibliográficas.
4. Mostrar una ficha para validación.
5. Registrar solamente los datos físicos propios de la institución: cantidad de ejemplares, ubicación y estado.
6. Mantener separados los datos de la edición y los datos del ejemplar físico.

## Fuentes bibliográficas

### Integradas automáticamente en el prototipo
- **Google Books**: se consulta con ISBN-10 e ISBN-13 equivalentes.
- **Open Library**: se consultan ambas variantes del ISBN y se aprovechan contenidos/tabla de contenidos cuando la fuente los ofrece.

Las consultas públicas actuales no requieren que la institución pague un servicio propio, aunque cada proveedor mantiene sus propias políticas, límites y disponibilidad.

### Fuentes argentinas incorporadas como verificación
- **Biblioteca Nacional de Maestros (BNM)**: https://bnm-catalogo.educacion.gob.ar/
- **Agencia Argentina de ISBN**: https://www.isbn.org.ar/web/busqueda-simple.php

Ambas se muestran dentro del flujo de incorporación como fuentes oficiales complementarias. En esta etapa no se hace scraping automático: no se encontró una API pública estable documentada que convenga usar directamente desde el navegador. Una futura integración servidor-a-servidor puede incorporar BNM/Koha mediante una interfaz oficial si estuviera disponible.

### Fuentes reservadas para una etapa futura
Si el proyecto obtiene financiamiento o inversión, evaluar servicios bibliográficos comerciales/institucionales como **ISBNdb** u otros proveedores especializados, siempre comparando cobertura para ediciones argentinas y latinoamericanas antes de contratarlos.

## Cámara y lectura de ISBN

El lector usa varias estrategias:

1. `BarcodeDetector` cuando el navegador lo soporta.
2. ZXing como alternativa para navegadores sin `BarcodeDetector`.
3. **Fotografiar código** para analizar una imagen fija cuando el video en vivo no logra detectar.
4. Ingreso manual del ISBN como último respaldo.

La cámara requiere HTTPS y permiso del navegador. No se suben fotogramas: la lectura se realiza en el dispositivo.

## Experiencia institucional

La navegación principal es:
- **Inicio**
- **Catálogo**
- **Incorporar material**
- **Configuración y respaldos**

Las altas y ediciones se realizan en pantallas completas, no en ventanas modales. El lenguaje está orientado a escuelas e instituciones y distingue registro bibliográfico, ejemplares físicos, ubicación, estado, temas, contenidos indexados y fuentes del registro.

La portada bibliográfica puede visualizarse ampliada. La foto del ejemplar físico se guarda aparte para documentar su estado real.

## Tema visual

La identidad gráfica toma el lenguaje editorial de Positivus: bloques sólidos, bordes de tinta, sombras duras, ilustración con libros y acentos rosa y celeste. Usa la paleta `#ED5AB3`, `#1640D6`, `#51C6FB`, `#3981F7`, `#0A112F`, `#EBF3FF`. Dispone de tema claro y oscuro; la preferencia queda guardada localmente. Los campos tienen un mínimo de 16 px sin bloquear el zoom manual.

Las acciones destructivas aparecen en una **Zona de peligro**, con descripción de la pérdida, botones rojos y confirmación cancelable. Esto incluye eliminar un registro, vaciar el catálogo local y confirmar la reducción de ejemplares con sus fotografías. Importar un respaldo avisa antes de reemplazar coincidencias.

## Funciones inspiradas en gestión bibliotecaria tradicional

La arquitectura contempla funciones ya habituales en sistemas como Aguapey: catalogación, ejemplares, ubicación, vocabularios/temas, consulta de catálogo, futura circulación y préstamos, estadísticas y catalogación por copia/importación.

El objetivo es conservar esas necesidades bibliotecológicas y modernizar la experiencia con escaneo, automatización, búsqueda natural e IA.

## IA: alcance previsto

La lectura del código de barras y las consultas por ISBN **no necesitan IA**. La IA se reserva para tareas donde aporte valor: analizar tapa/contratapa cuando no hay ISBN, leer un índice fotografiado, detectar cuentos/capítulos, normalizar y traducir temas, proponer vocabulario educativo, mejorar búsquedas en lenguaje natural y detectar posibles inconsistencias entre fuentes.

La extracción de índice mediante IA todavía no está implementada en este prototipo.

## Almacenamiento actual

Los datos se guardan localmente con IndexedDB. No hay Supabase ni servidor pago en esta etapa.

Se puede exportar/importar un respaldo JSON que incluye registros y fotos de ejemplares. Borrar datos del sitio puede borrar el catálogo local, por lo que durante el piloto es importante conservar respaldos.

## Publicación

El proyecto se publica desde GitHub Pages y está preparado para funcionar bajo:

https://sanlean.com.ar/AsistenteBibliotecario/

No debe agregarse un `CNAME` propio a este repositorio porque el dominio principal se administra desde el sitio raíz de la cuenta.

## Desarrollo

```sh
node scripts/serve.mjs
node --test tests/*.test.js
```

Con Playwright disponible y el servidor local abierto:

```sh
node tests/browser.cjs
node tests/isbn-browser.cjs
node tests/photos-browser.cjs
node tests/migration-browser.cjs
```

`PLAYWRIGHT_MODULE` permite indicar una instalación externa de Playwright. `BROWSER_CHANNEL=chrome` selecciona Chrome (por defecto Edge), `TEST_ENGINE=webkit` usa WebKit con perfil iPhone y `TEST_BASE_URL` permite probar una publicación. Cada prueba usa un contexto aislado sin acceder al catálogo del usuario. Las fuentes bibliográficas se simulan con respuestas deterministas y los códigos de barras se decodifican realmente con ZXing. Los resultados visuales se guardan en `qa/` (excluido de Git).

La regresión del guardado está cubierta: el campo oculto `name="id"` oculta la propiedad `form.id`; se identifica el formulario con `matches('#book-form')`, se cancela el envío nativo y se espera la transacción IndexedDB. Se comprueban persistencia tras recarga, validaciones visibles, fallo de cuota y reintento sin perder la ficha.

Archivos principales:
- `src/isbn.js`: validación y equivalencias ISBN.
- `src/metadata.js`: fuentes bibliográficas y combinación de registros.
- `src/scanner.js`: cámara, ZXing y fotografía de códigos.
- `src/subjects.js`: vocabulario temático en español.
- `src/catalog.js`: validación y búsqueda.
- `src/storage.js`: IndexedDB.
- `src/app.js`: navegación y experiencia institucional.

## Próximas etapas

- Análisis de índice mediante foto + IA.
- Integración oficial más profunda con BNM/Koha si existe un endpoint apto.
- Ampliación del vocabulario BNM/VEA para búsqueda educativa.
- Circulación, préstamos, reservas y alertas.
- Usuarios institucionales.
- Estadísticas.
- Sincronización entre dispositivos/escuelas.
- Red de bibliotecas escolares.
