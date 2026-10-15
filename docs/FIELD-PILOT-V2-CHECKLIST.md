# Lista final — Field Pilot V2

Usar una copia por escuela y anotar fecha, equipo, navegador, versión y responsable. No incluir nombres de lectores en el informe de QA.

## Puerta técnica de publicación

- [ ] CI Tests verde para el commit final (unit, integrity, syntax, simulación y todos los shards).
- [ ] Pages verde para ese mismo commit; versión publicada 0.11.0-field.2.
- [ ] Descargar y conservar artefactos de QA del commit.
- [ ] Backup roundtrip completo y rechazo de archivos corruptos.
- [ ] Offline: cerrar pestaña, cortar red, reabrir y probar operaciones locales.
- [ ] Mobile 320/390, intermedios 768/1024 y desktop 1440; temas claro/oscuro.
- [ ] Roles, permisos temporales, aislamiento institucional y acceso denegado por URL.
- [ ] Catalogación: equivalencias, revisión de coincidencias, lote y persistencia.
- [ ] Mostrador: préstamos, devoluciones, restricciones y doble envío.
- [ ] Inventario: zona, diferencias, préstamo excluido y cierre sin pérdida automática.
- [ ] Proyectos, reservas, renovación y aprobación de experiencias.
- [ ] Hemeroteca: publicación, número, artículo y ejemplar físico.
- [ ] Migración: preview, legado, conflictos, atomicidad y restauración posterior.
- [ ] Red Escolar: snapshot sin personas y cooperación manual completa.
- [ ] Analítica: recuentos exactos con dataset y ausencia de ranking personal.
- [ ] Ayuda: búsqueda, rol, contexto, tour opcional e impresión.
- [ ] Seguridad: texto hostil inerte, URL/CSV y errores de consola.
- [ ] Privacidad: datos propios, exportación agregada y diagnóstico sin catálogo.

## Puerta presencial antes de operar

- [ ] Revisar [limitaciones](KNOWN-ISSUES.md), en particular límite de backup y modo local.
- [ ] Preparar respaldo fuera del navegador y ensayar restauración en un perfil de prueba.
- [ ] Confirmar responsable y ciclo/cursos de la institución real.
- [ ] Probar cámara, foto, OCR, ingreso manual y lector USB disponible.
- [ ] Verificar etiquetas impresas, escala de papel, QR y Code128 con el lector real.
- [ ] Recorrer teclado, foco, contraste y lector de pantalla que utilice la escuela.
- [ ] Acordar un equipo principal y procedimiento si falla o se pierde conexión.
- [ ] Registrar incidencias sin datos personales y revisar al cierre de cada jornada.

Los casilleros presenciales no se marcan por haber pasado CI. El piloto requiere comprobar el entorno concreto.
