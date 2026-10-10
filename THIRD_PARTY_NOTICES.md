# Componentes y avisos de terceros

Inventario de FIELD PILOT V1. Los archivos de licencia enlazados se distribuyen junto a los componentes; este resumen no los reemplaza. Los bundles no se modificaron para cambiar sus licencias.

| Componente | Versión incluida | Uso | Licencia/aviso local |
| --- | --- | --- | --- |
| ZXing Browser | 0.2.1 | Cámara y lectura de códigos como alternativa al detector nativo | MIT, [ZXING-LICENSE.txt](vendor/ZXING-LICENSE.txt) |
| ZXing Library, incluida en el bundle anterior | Versión interna no identificada de forma independiente en este repositorio; se conserva el bundle fijado | Decodificación QR/barras | Apache-2.0 y avisos incluidos, [ZXING-LIBRARY-LICENSE.txt](vendor/ZXING-LIBRARY-LICENSE.txt) |
| qrcode-generator | 1.4.4 | Generación local de QR de ejemplares | MIT, [licencia](vendor/qrcode-generator-LICENSE) |
| JsBarcode | 3.12.1, Code128 | Etiquetas de barras AB | MIT, [licencia](vendor/JsBarcode-LICENSE) |
| Tesseract.js | 6.0.1 | Reconocimiento local bajo demanda | Apache-2.0, [licencia](vendor/ocr-6.0.1/LICENSE-tesseract-js) y avisos `*.LICENSE.txt` del bundle |
| tesseract.js-core | 6.0.0 | Motor WASM, variantes normales/SIMD/LSTM | Apache-2.0, [licencia](vendor/ocr-6.0.1/LICENSE) |
| tessdata_fast español | 4.1.0 | Datos de idioma OCR local | Apache-2.0, [licencia](vendor/ocr-6.0.1/LICENSE-tessdata) |
| Inter | Archivo local fijado; versión tipográfica no declarada aquí | Texto e interfaz | SIL OFL 1.1, [Inter-OFL.txt](assets/fonts/Inter-OFL.txt) |
| Lora | Archivos locales normal/italic fijados; versión tipográfica no declarada aquí | Titulares | SIL OFL 1.1, [Lora-OFL.txt](assets/fonts/Lora-OFL.txt) |
| Playwright | 1.62.1 en CI | Automatización de QA, no enviado al navegador del producto | Apache-2.0, paquete oficial Microsoft Playwright |

Los orígenes, tamaños y SHA-256 de los recursos OCR están en [manifest.json](vendor/ocr-6.0.1/manifest.json), comprobados por el checker. Las fuentes documentan sus orígenes en [assets/fonts/README.md](assets/fonts/README.md). Las dependencias de QA se instalan solo para las pruebas. Open Library y Google Books son fuentes externas, no bibliotecas redistribuidas; sus respuestas y portadas no se incorporan a la caché de la aplicación.
