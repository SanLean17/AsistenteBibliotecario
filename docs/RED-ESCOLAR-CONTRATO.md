# Contrato federado V1 y futura API (no implementada)

`src/federation.js` conserva la fachada pública preexistente. `federation-contract.js` implementa validación y proyecciones puras; `federation-domain.js`, comandos locales; `federation-ui.js`, interacción. El adaptador IndexedDB verifica SHA-256 antes de una transacción y revalida estructura, permiso, institución, actor y versión observada durante el commit. Una API futura podrá reemplazar la fuente de snapshots sin mezclar registros remotos con `books`.

## Envelope de intercambio

- `app: "asistente-bibliotecario-federation"`, `contractVersion: 1`.
- `institution: {id, name, libraryName}`; `id` es `settings.local.federationInstitutionId`, estable aunque cambie el nombre.
- `exportedAt`: fecha ISO; se rechazan fechas más de un día en el futuro.
- `records`: registros del contrato existente `version: 1`, cada uno con `institution`, `material`, `holdings`.
- `checksum` opcional: `sha256:` + 64 caracteres hexadecimales. Se calcula sobre JSON ordenado recursivamente por claves, excluyendo checksum. No acredita autenticidad.

`material` permite `localRecordId`, `workId`, `editionId`, `materialType`, `title`, `author`, `publication`, `publicationDate`, `publisher`, `year`, `language`, `subjects`, `identifiers` (`isbn`, `issn`, `doi`) y `resourceUrl` opcional HTTP/HTTPS sin credenciales. No hay autoridades inventadas ni enriquecimiento por red. Obra, edición y ficha requieren identidad; el ISBN no sustituye sus IDs.

`holdings` conserva `total`, `status`, `label`, `estimatedAt`. Agrega `available`, `unavailable`, `interlibraryAllowed`. Registros antiguos sin estos agregados pueden validarse, pero no habilitan préstamos. `items` opcional contiene exclusivamente `{exemplarId, institutionId, internalCode, globalHoldingRef}`; la exportación nueva solo incluye identidades actualmente prestables. Los registros previos con otros ejemplares mínimos se pueden leer sin inventar disponibilidad individual.

Se rechazan campos fuera de cada allowlist, claves privadas a cualquier nivel, identidades contradictorias, fichas/ediciones/ejemplares duplicados, controles inválidos, URLs peligrosas y agregados inconsistentes. Pueden repetirse workIds para distintas ediciones. Texto bibliográfico libre se escapa siempre; no existe un detector infalible de datos personales dentro de un título.

Límites: 10 MB/archivo, 10.000 registros, 100 temas/registro, profundidad 12, strings con topes por campo, 20 snapshots y 50.000 registros remotos/espacio. La UI pagina búsqueda (30) y selección propia (50). La comparación muestra hasta 50 detalles por grupo con conteos completos. No descarga portadas ni consulta metadatos importados.

## Persistencia privada y propiedad

IndexedDB 12 agrega `federationSnapshots` y `externalHoldings` sin reconstruir las stores existentes. El `institutionId` raíz de cada fila identifica el **espacio local que la conserva**, como exige `projectState/mergeScope`. La institución remota se conserva como `externalInstitutionId` en snapshots y solicitudes; como `ownerInstitutionId` en material externo. El envelope de intercambio usa `institution.id`; nunca confundirlo con el scope local.

Snapshots contienen id, identidad/nombre/biblioteca remota, exportedAt/importedAt, contractVersion, records, checksum y como máximo cinco metadatos de reemplazos (`importedAt`, `exportedAt`, `recordCount`). La importación reemplaza una versión entera, conserva el ID de snapshot y compara el importedAt esperado para detectar otra importación concurrente. Las solicitudes conservan sus referencias originales aunque luego desaparezca la ficha del snapshot.

`resourceSharingRequests.networkVersion=1` distingue el nuevo seguimiento del borrador manual anterior. El comando anterior no puede cambiar sus estados. Las transiciones admitidas son draft → prepared/cancelled, prepared → agreed/cancelled, agreed → received/cancelled, received → returned. En solicitudes físicas, recibir crea `externalHoldings` en la misma transacción. Devolver actualiza ambas filas. No hay circulación secundaria ni asignación de AB local. Una segunda recepción activa de la misma referencia global se rechaza. Historial devuelto puede coexistir con una recepción futura.

El formato privado de respaldo sigue en versión 5. El lector nuevo acepta respaldos anteriores sin estas stores; al restaurar verifica snapshots, checksums y referencias de cooperación. Se debe usar la aplicación nueva para recuperar respaldos que contengan Red Escolar; aplicaciones viejas no conocen estos almacenes. `federationVisibility` se conserva en materiales y respaldo: ausencia equivale a `local-only`.

## Futura API: requisitos pendientes, sin endpoints activos

Antes de conectar instituciones harían falta:

1. Autenticación real y vinculación verificable de personas con escuelas; el selector local no sirve como credencial.
2. Registro/discovery de instituciones y administración de su identidad estable. Verificación del propietario, autorización de publicación y retiro de catálogos.
3. Consentimiento de alcance, permisos por institución y propósito; metadatos de préstamo agregados separados de circulación privada.
4. Transporte seguro, control de versiones/revisiones, límites y sincronización incremental. Resolución explícita de conflictos y bajas sin fusionar ediciones arbitrariamente.
5. Solicitudes con emisor/destinatario autenticados, idempotencia, aceptación de ambas partes y reglas para custodia y devolución. Un cambio local de estado no prueba un acuerdo remoto.
6. Notificaciones optativas, preferencias y trazabilidad. No convertir el archivo actual en una lista de emails.
7. Auditoría distribuida con retención y controles de acceso, recuperación, revocación, tratamiento de incidentes y evaluación de privacidad.

SHA-256 seguirá siendo integridad, no autorización. Firmas y claves, si se adoptan, requieren un diseño y pruebas propios. Nada de lo anterior está habilitado en V1.
