# Fuentes bibliográficas — investigación del 5 de octubre de 2026

## Biblioteca Nacional Mariano Moreno (BN)

La [configuración oficial de Z39.50](https://portal.bn.gob.ar/bibliotecarios/protocoloZ3950) distingue registros bibliográficos y autoridades. Parámetros bibliográficos: `200.123.191.9:9991`, base `BNA01`, usuario y clave públicos `Z39.50`, UTF-8 y MARC21. La base de autoridades es `BNA10`; no debe tratarse como libros. La página publica contactos técnicos separados para consultar el servicio.

En esta iteración se confirmó conexión TCP al puerto documentado. Eso **no confirma** negociación Z39.50, autenticación ni recuperación de un registro real. El entorno no tiene instalado YAZ. El adaptador está implementado y probado con transporte simulado y MARC UTF-8; no está activado en la web ni se presenta como fuente consultada.

### Implementación preparada

`server/bn-provider.mjs` usa el cliente libre [YAZ](https://www.indexdata.com/resources/software/yaz/) mediante `execFile` sin shell: destino fijo, ISBN validado, búsqueda Bib-1 por ISBN, hasta cinco registros por variante, timeout de 12 segundos y limpieza de temporales. Sigue los [comandos documentados de yaz-client](https://software.indexdata.com/yaz/doc/yaz-client.html). Conserva la distinción entre respuesta vacía y error. No admite URL/host arbitrarios ni comandos del cliente. El transporte se inyecta para pruebas.

`parseISO2709` interpreta offsets en bytes y UTF-8. `marcToMetadata` admite MARCJSON; el mapeo sigue el [formato bibliográfico MARC21 de Library of Congress](https://www.loc.gov/marc/bibliographic/bdsummary.html):

| Campo | Modelo |
|---|---|
| 020$a | ISBN válido y equivalencias; rechaza una edición no coincidente |
| 245$a/b/n/p | Título, subtítulo, partes |
| 100/110/111 y 700/710/711 | Autorías personales y corporativas |
| 250 | Mención de edición |
| 264 con indicador 2 = 1; alternativa 260 | Editorial y fecha de publicación |
| 041$a; alternativa 008/35-37 | Idioma |
| 300$a | Páginas (conservación de descripción completa en el registro de origen) |
| 600/610/611/630/650/651/655 | Temas, géneros y subdivisiones |
| 080/082/084 | Clasificación |
| 505$a/t | Contenidos |
| 520 | Descripción/resumen |
| 001/003 | Identificador y agencia |

No importa existencias externas como ejemplares escolares. Un servidor futuro debe preservar el MARC original junto a la procedencia, revisar derechos/atribución, filtrar por ISBN canónico y cachear ediciones.

### Evaluación de infraestructura gratuita

GitHub Pages sirve archivos estáticos; no ejecuta YAZ ni conexiones Z39.50. Una función serverless necesita salida TCP al puerto 9991 y un binario compatible; no es suficiente un proxy HTTP genérico. No se contrató ni desplegó ningún servicio.

La opción sin costo de infraestructura adicional para un piloto es ejecutar el adaptador en un equipo institucional con Node + YAZ. Antes de activarlo en producción faltan probar una recuperación real, acordar el acceso, servir una pasarela HTTPS autenticada con validación estricta de origen/ISBN, límites de solicitudes y concurrencia, caché por ISBN, observabilidad sin datos personales y política de mantenimiento. No se promete un alojamiento gratuito permanente ni se expone un proxy abierto. El frontend permanece con sus dos fuentes actuales hasta completar esos requisitos.

## Biblioteca Nacional de Maestros (BNM)

El [catálogo oficial de la BNM](https://bnm-catalogo.educacion.gob.ar/) es independiente de la BN y utiliza Koha. La [documentación oficial de Koha](https://api.koha-community.org/) describe APIs; su existencia en el software no demuestra que la BNM habilite un acceso público a registros, SRU o Z39.50.

La investigación de páginas oficiales no encontró instrucciones públicas verificables para API/SRU/Z39.50/MARC export masivo de esta instalación. El catálogo se conserva como consulta externa. Próximo paso: solicitar al equipo de la BNM endpoint autorizado, autenticación, límites, campos MARC y condiciones de reutilización. No se ensayaron rutas privadas ni se implementó scraping de HTML. Esta ausencia de documentación encontrada no implica que la institución carezca de un servicio para convenios.

## ISBN Argentina

Se mantiene el [buscador oficial](https://www.isbn.org.ar/web/busqueda-simple.php) como verificación. No se encontró documentación pública de una API automatizable. El sitio tampoco pudo recuperarse desde la herramienta de investigación en esta sesión; no se infiere de ello que esté fuera de servicio. La integración queda pendiente de consultar oficialmente acceso, límites, licencia de metadatos y eventual costo. Sin scraping.

## Proveedores comerciales

ISBNdb y WorldCat/OCLC figuran en el registro de proveedores como futuros, desactivados. No hay claves, cargos, contratos ni solicitudes a ellos. Evaluar cobertura argentina, permisos de reutilización, deduplicación y costo solo si existe financiamiento o acceso institucional.
