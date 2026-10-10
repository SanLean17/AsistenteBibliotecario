# OCR local controlado

Versiones fijadas: Tesseract.js 6.0.1, tesseract.js-core 6.0.0 y español de tessdata_fast 4.1.0. Todos se distribuyen bajo Apache-2.0; se conservan las licencias y los avisos de los bundles. Los archivos proceden de los paquetes npm oficiales y del repositorio tesseract-ocr/tessdata_fast. `manifest.json` registra orígenes, tamaños y SHA-256; el check de integridad verifica los archivos.

Se conservan las cuatro variantes WASM embebidas que puede seleccionar el motor. No se modificaron sus bundles. El proveedor usa OEM LSTM y carga una sola variante compatible con el equipo, el worker y español, únicamente al solicitar OCR. No hay CDN en tiempo de ejecución. El worker de la aplicación contiene el worker del motor para poder terminar ambos al cancelar.

La imagen se prepara en el navegador y se pasa por mensaje al worker local. No hay peticiones de subida. La consulta opcional de metadatos usa exclusivamente un ISBN elegido por la persona y los proveedores ya existentes.
