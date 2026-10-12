# FIELD PILOT V1

## Escuelas con catálogo previo

No es necesario empezar de cero. Usá [Centro de Migración](MIGRACION.md) desde Importar / exportar para CSV de Excel/Sheets, TSV, Aguapey UTF-8 o catálogo JSON propio. Hacé primero una prueba pequeña con respaldo previo; revisá columnas, conflictos, ubicaciones y ejemplares antes del commit atómico. Después imprimí etiquetas AB e iniciá un inventario físico de validación. No se importan automáticamente personas ni perfiles. MARC-8 requiere conversión externa y la exportación MARC sigue deshabilitada.

Versión **0.2.0-field.1**, 11 de octubre de 2026. Base: RC1 `a77cb37`. Aplicación local para una prueba escolar controlada de varios días. No representa validación en una escuela real ni soporte multiusuario en línea.

## Matriz del producto

«Local probado» significa cobertura automatizada de dominio y/o navegador, no certificación ni prueba de hardware. «Offline» supone haber abierto la aplicación con conexión y visto el aviso de preparación completa, en el mismo navegador y perfil.

| Ruta o capacidad | Estado de campo | Sin conexión | Límite relevante |
| --- | --- | --- | --- |
| Inicio `#inicio` | Local probado | Sí | Datos del navegador actual |
| Catálogo `#biblioteca`, ficha `#ficha/...` | Local probado | Sí | 48 tarjetas por página; portadas externas pueden faltar |
| Agregar `#agregar`, editar `#editar/...` | Local probado | Manual sí | Consultas por ISBN requieren red |
| Jornada `#jornada-catalogacion/...` | Local probado | Captura/revisión/incorporación local | Pendientes de metadatos se completan manualmente o al recuperar red |
| Asistencia `#asistencia/...` | Experimental, confirmación humana | No garantizado para el motor OCR | Descarga diferida del motor local; precisión depende de la imagen |
| Mostrador `#mostrador/...` | Local probado | Sí | Cámara física y lector USB deben validarse en el equipo |
| Préstamos/devoluciones `#circulacion` | Local probado | Sí | Operaciones serializadas en esta base local |
| Reservas `#reservas` | Local probado | Sí | Sin envío automático de mensajes |
| Mi biblioteca `#mi-biblioteca`, `#guardados` | Local probado | Sí | Perfil local simulado, sin contraseña |
| Ejemplares `#ejemplares`, `#ejemplar/...` | Local probado | Sí | Listado completo de ejemplares todavía puede ser largo |
| Inventario `#inventario` | Local probado | Sí | No encontrar no implica declarar perdido; se conserva la sesión |
| Estado físico `#atencion` | Local probado | Sí | Registro objetivo, sin atribución de culpa |
| Personas `#usuarios`, `#permisos` | Local limitado | Sí | No constituyen autenticación segura |
| Institución `#organizacion`, registro local | Local limitado | Sí | No vincula ni sincroniza computadoras |
| Colección/cooperación `#coleccion` | Local limitado | Sí | Preparación y seguimiento local; sin red interbibliotecaria real |
| Avisos `#avisos` | Local probado | Sí | Solo dentro de la aplicación |
| Calidad `#calidad`, `#diagnostico` | Local probado, análisis acotado | Sí | Duplicados: hasta 20.000 comparaciones/500 propuestas; avisa si es parcial |
| Preparación `#puesta-en-marcha` | Local probado | Sí | Checklist no sustituye la revisión institucional |
| Piloto `#piloto` e informe | Local probado | Sí | Observaciones e informe locales, sin telemetría |
| Actividad `#actividad` | Local probado | Sí | Historial local, no auditoría de identidades autenticadas |
| Etiquetas `#etiquetas/...` | Generación local probada | Sí | QR/Code128 decodificados; pendiente impresora física |
| Aguapey `#interoperabilidad` | Importación UTF-8 probada | Sí | Vista previa/cola; MARC-8 y exportación MARC no disponibles |
| Configuración `#configuracion` y respaldos | Local probado | Sí | 50 MB por importación, 10.000 materiales; muchas fotos pueden excederlo |
| Diagnóstico exportable | Local probado | Sí | Cantidades/versión/integridad; no sirve para restaurar |
| Landing pública | Informativa | No garantizado | Abrir `app.html` para el trabajo offline |
| BN Z39.50, cuentas, sincronización, notificaciones externas | No disponible en Pages | No | No se incorporó backend, IA nueva ni servicios pagos |

## Preparar el uso sin conexión y actualizar

Abrir `app.html` con HTTPS (o localhost para desarrollo) y esperar «Preparada para abrir sin conexión». Cerrar y volver a abrir esa misma dirección sin internet antes del piloto. El manifiesto permite la presentación instalada cuando el navegador lo admite; no se exige instalarla. No usar modo privado. El navegador puede retirar almacenamiento por espacio o políticas: siempre mantener un respaldo externo.

El worker guarda solamente una lista cerrada de archivos de la release: HTML, estilos, módulos, fuentes, ilustraciones y generadores/lector de etiquetas. Cada archivo se verifica por SHA-256; un despliegue incompleto deja funcionando la versión anterior. No cachea bibliografía remota, catálogos exportados, fotos de usuarios ni peticiones de proveedores. OCR pesado queda diferido y fuera de la precarga. Los datos continúan en IndexedDB, versión 11; el worker no abre ni borra esa base.

La navegación a `app.html` usa el conjunto de archivos de la versión activa. El navegador comprueba actualizaciones del worker sin caché HTTP; cuando hay una lista, la UI avisa. Terminar operaciones, exportar respaldo, cerrar otras pestañas y aplicar desde Configuración. No se fuerza recarga durante trabajo. Se conserva la caché anterior mientras puede haber un documento anterior y se elimina la más antigua en activaciones posteriores. Si todas las pestañas de una versión se cerraron, el navegador puede activar la actualización al volver a abrir.

Los cambios de código/estilos deben actualizar coherentemente `?v=`, la versión visible/package y regenerar `sw.js` con `node scripts/build-offline.mjs`. El checker verifica referencias, versiones, bytes de OCR y que el worker generado corresponda al árbol actual. `.gitattributes` fija LF para assets de texto y conserva los bytes OCR originales.

## Escala y recuperabilidad

Fixtures solo de QA: 100 materiales/150 ejemplares/20 personas; 2.000/3.000/200 y 500 préstamos históricos; 10.000/15.000/1.000 y 4.000 históricos. No se siembran en producción. Las mediciones se guardan en `qa/field-volume.json` y `qa/field-benchmark-*.json`; son diagnósticos del equipo que ejecuta, no un SLA móvil.

La búsqueda conserva sus campos, pesos, normalización y orden determinista. Su índice se reconstruye al cambiar el snapshot. La interfaz pagina tarjetas y mantiene consulta/filtros/página al regresar desde una ficha. Mostrador limita los resultados de personas a diez. Se agrupan préstamos para evitar recorrer todo el historial por cada persona o material.

El almacenamiento conserva una sola transacción para leer, validar y escribir operaciones relacionadas; ahora escribe diferencias en vez de borrar y reescribir todos los stores. Aún lee snapshots completos: hay margen de mejora para equipos con poca memoria. No se modificó el esquema ni se borran datos al actualizar. Una excepción aborta toda la transacción. Se prueban doble préstamo, doble devolución, doble submit, navegación durante guardado, recarga, reanudación de inventario/jornada e importación inválida sin cambios.

El respaldo se verifica en dos etapas, estructura y relaciones, antes de ofrecer una vista previa y pedir confirmación. Incluye catálogo, fotos, personas, circulación, permisos, ubicaciones, jornadas, inventarios, asistencia, piloto y cooperación. Una descarga iniciada no se presenta como un archivo ya conservado: la persona debe comprobarlo. Se mantiene compatibilidad de lectura v1–v5; v1–v3 representan catálogo/fotos y no inventan historial que esos formatos no tenían.

## Compatibilidad, accesibilidad y seguridad

| Entorno | Evidencia | Pendiente |
| --- | --- | --- |
| Chromium / Edge escritorio | Suite amplia, offline, volumen, OCR local y cancelación | Cámara/impresora/USB del equipo escolar |
| Firefox | Smoke compacto en CI: apertura, catálogo, Mostrador sin cámara, Mi biblioteca y parse de respaldo | Offline/OCR/cámara completos y teléfonos; el binario local Windows no inició |
| WebKit | Smoke compacto local y CI con perfil iPhone | Safari en iPhone físico, cámara y teclado virtual |
| Chrome Android | Layout emulado 320/390 y alternativa manual/foto | Escaneo real y memoria en dispositivo físico |
| Safari iOS | WebKit emulado no equivale a Safari físico | Permisos de cámara, suspensión y reapertura en iPhone |

Matriz visual de 25 rutas × 320/390/768/1440 × light/dark; controles con nombre, foco, navegación y diálogos. Catálogo a texto grande y movimiento reducido. No es certificación WCAG AA: quedan contraste exhaustivo, tecnologías de asistencia y hardware. Impresión A4 revisada en DOM/medios print y capturas, con márgenes y bloques indivisibles; hacer una hoja física antes de una tirada.

Los campos renderizados se escapan; hay pruebas de HTML/script inerte, URL insegura y JSON malicioso. No hay eval ni un motor nuevo de plantillas. Las fotos físicas se recodifican localmente. Los perfiles locales no son una barrera de seguridad frente al propietario del navegador. Revisar [privacidad](PRIVACIDAD-PILOTO.md) antes de cargar datos reales.

## Cómo probar y operar

Los grupos de `scripts/test-browser.mjs` separan smoke, flujos extensos, field, motor OCR y compatibilidad compacta. No necesitan un localhost ajeno: usan un harness de archivos o un servidor efímero propio. Los proveedores se controlan en tests; la suite OCR real se separa de la revisión de propuestas con resultados deterministas. No se deshabilitan pruebas ni se usa `continue-on-error`.

Comandos y ejecución: [README](../README.md). Resultados y límites de esta entrega: [estado FIELD PILOT](FIELD-PILOT-STATUS.md). Operación: [Biblioteca](GUIA-BIBLIOTECA.md), [Docente](GUIA-DOCENTE.md), [Autoridad](GUIA-AUTORIDAD.md), [protocolo de cinco días](GUIA-PILOTO-ESCUELA.md), [lista imprimible](checklist-piloto.html) y [recuperación](SI-ALGO-SALE-MAL.md).
