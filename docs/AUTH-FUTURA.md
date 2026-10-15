# Contratos conceptuales para autenticación futura

Este documento no implementa servicios online. La aplicación actual es local, sin backend, Supabase, Firebase, passwords, OAuth ni envío de emails.

## Entidades y límites

| Entidad | Contrato futuro |
| --- | --- |
| Person | Persona institucional con identificador interno. No es una cuenta ni prueba identidad. Puede existir sin acceso online. |
| UserAccount | Identidad autenticable con identificador verificado, estado y mecanismos de acceso acordados. Puede relacionarse con personas de varias instituciones. |
| InstitutionMembership | Relación de una cuenta con una institución y, cuando corresponde, su Person institucional. Estado, inicio, fin y actor que autorizó. La membership local actual vincula Person: la migración requerirá vinculación explícita y verificada, nunca por nombre. |
| RoleAssignment | Perfil y permisos autorizados dentro de una membership, con vigencia, actor y trazabilidad. El cargo laboral y el responsable principal siguen separados. |
| Session | Sesión emitida y validada por servidor, con expiración, revocación y contexto institucional autorizado. Ningún ID de localStorage concede acceso. |
| Invitation | Solicitud emitida por actor autorizado, limitada a institución y perfil, con token de uso único y vencimiento. Estados: pending, accepted, expired, revoked. |

Una cuenta puede pertenecer a varias instituciones. Cambiar contexto exige verificar la membership en el servidor para cada solicitud. No basta filtrar datos en el cliente. Identificadores estables de libros, ejemplares y personas deben mantenerse al migrar y no mezclarse entre instituciones.

## Requisitos antes de habilitar acceso remoto

- Elegir email u otro identificador verificado y el mecanismo password/OAuth. No convertir el correo opcional actual en identidad verificada.
- Almacenar credenciales únicamente con mecanismos de servidor apropiados; sesiones seguras, expiración, revocación, protección CSRF según arquitectura y límites de intentos.
- Reset seguro y recovery tokens de uso único, con vencimiento y revocación. MFA opcional según necesidades. No reutilizar el selector local ni un PIN como autenticación remota.
- Validar permisos, jerarquía, institución y vigencias en cada operación. Impedir auto-escalación y asignación de roles superiores sin autorización.
- Auditar cambios con identidad y tiempo verificables en servidor. El historial local actual es útil para operación, pero no es una auditoría resistente a manipulación.
- Diseñar consentimiento, minimización, exportación, conservación y recuperación; resolver conflictos de sincronización antes de habilitar escrituras entre equipos.
- Probar aislamiento entre instituciones, revocación inmediata, recuperación, invitaciones vencidas/reutilizadas y vinculación de una persona existente sin duplicación ni apropiación de identidad.

No hay endpoints, tokens ni simulaciones de estos contratos en V1. La futura migración tendrá una versión y validación propias, manteniendo los respaldos locales y el historial.
