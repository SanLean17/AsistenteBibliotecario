# Limitaciones verificadas — Field Pilot V2

- **Modo local:** seleccionar perfil no es autenticación. Una persona con acceso al navegador/DevTools puede modificar su almacenamiento. Los controles de rol protegen los flujos de la aplicación; no constituyen una frontera contra el propietario del dispositivo. No hay sincronización entre equipos.
- **Tamaño del respaldo:** el lector de respaldos admite hasta 10.000 materiales y 10.000 fotos; la interfaz rechaza archivos mayores de 50 MB. La medición lógica con 20.000 materiales NO valida restauración de ese tamaño. El piloto recomendado usa 2.000 materiales/4.000 ejemplares y debe comprobar su propio archivo, especialmente con fotografías. No crecer por encima de estos límites confiando en la exportación sola.
- **Persistencia:** borrar datos del navegador, cambiar de perfil/origen o perder el equipo puede perder datos. Iniciar una descarga no prueba que el archivo se conservó. Guardar y verificar copias fuera del navegador al comienzo y cierre de jornada.
- **Offline:** requiere preparación completa previa en ese navegador. No recupera portadas o metadatos externos no disponibles. El indicador de service worker en Diagnóstico no reemplaza una reapertura real sin red.
- **OCR y cámara:** las pruebas automatizadas usan imágenes y dispositivos simulados; no validan foco, iluminación, permisos del sistema ni todos los teléfonos. El OCR puede equivocarse y siempre necesita confirmación. Se conserva ingreso manual/foto/lector USB como alternativa según disponibilidad.
- **Escala:** los tiempos de QA pertenecen al equipo/runner que los midió. No son un SLA; 20k se mide en lógica, 10k en navegador. La escuela debe medir su equipo con su catálogo y fotos.
- **Accesibilidad e impresión:** smoke de etiquetas, encabezados, tamaños, teclado y estilos de impresión; no es certificación WCAG ni prueba de impresora física. La revisión humana de contraste, lectores de pantalla y papel sigue en la lista de campo.
- **Red Escolar:** snapshot manual, disponibilidad potencialmente desactualizada; coordinación externa manual. No se transfieren lectores ni historiales personales.
- **Formularios:** una operación sin confirmar no crea registros. No todos los formularios mantienen texto sin guardar tras recargar. Onboarding, jornadas, inventarios y proyectos confirmados sí tienen persistencia comprobada.
- **Historial y archivos de QA:** las evidencias de Actions se conservan siete días. Para una evaluación institucional, descargar el artefacto del commit evaluado. Los documentos de pilotos anteriores describen su propia versión, no el resultado de V2.

No se atribuye estado «sin errores» a hardware, servicios externos o procesos escolares aún no probados presencialmente.
