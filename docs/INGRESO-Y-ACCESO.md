# Ingreso institucional y acceso local V1

En un navegador vacío se abre la configuración inicial, sin crear una escuela ficticia. Las instalaciones anteriores conservan sus identificadores, perfiles, catálogo e historial.

## Crear una biblioteca

1. Institución: nombre obligatorio; nivel, turno, localidad y provincia opcionales.
2. Biblioteca: nombre obligatorio.
3. Responsable: nombre, cargo institucional y perfil Biblioteca o Autoridad. El cargo y el perfil son campos distintos. No se exige Dirección, DNI, teléfono ni domicilio.
4. Política básica: plazo de préstamos y habilitación de reservas. Organización permite revisar después las reglas por perfil.
5. Backup inicial: descargar y comprobar el archivo. Es posible continuar sin descargarlo; la aplicación nunca afirma haber verificado que se conservó.
6. Listo: cargar materiales, importar Aguapey/CSV mediante Migration Center, agregar personas, restaurar o consultar Puesta en marcha.

El borrador se conserva en IndexedDB. Los pasos se pueden retomar y la creación usa un identificador estable para evitar duplicados. Después del alta, el progreso pertenece a la configuración institucional y forma parte del respaldo.

## Perfiles y responsabilidad

El iniciador conserva exactamente el perfil elegido. Recibe permisos adicionales explícitos para configurar la institución, administrar perfiles, respaldar, restaurar, vaciar, transferir administración y desactivar. Se pueden inspeccionar en Personas y permisos. No recibe un perfil superadmin. Los perfiles de Autoridad conservan sus límites operativos: ser Autoridad no habilita por sí mismo la catalogación.

`primaryInstitutionResponsibleId` identifica al responsable principal. Cambiar esa referencia en Organización exige escribir el nombre de la institución, registra a la persona anterior, la nueva y el actor, y por sí solo no modifica perfiles ni grants. El titular de los permisos iniciales puede marcar por separado su transferencia: se revocan sus grants y se conceden al sucesor con auditoría, sin modificar perfiles. La opción está desmarcada por defecto y no permite otorgarse permisos a uno mismo. Antes del relevo hay que revisar los permisos, respaldos y pendientes. Las instituciones anteriores conservan su mecanismo de administración principal para compatibilidad.

Una referencia ausente o inactiva muestra una advertencia. Si queda otra persona de Biblioteca/Autoridad activa, puede registrar el relevo. Si no queda ninguna, se muestra una alerta y se preservan los datos. No se reactiva a nadie automáticamente. Recuperar acceso o datos permite descargar una copia de emergencia, con confirmación del nombre, únicamente cuando esa institución no tiene ninguna vinculación de gestión habilitada. Es preservación local de datos y no restitución de identidad; restaurarla tampoco reactiva personas. Las operaciones siguen sujetas a sus permisos; el acceso al dispositivo no constituye identidad verificada.

## Sesión y privacidad

El selector dice “Modo local / simulación de acceso”. Muestra nombre, perfil, cargo e institución. Es una herramienta para operar localmente, no un login real. Cerrar sesión elimina el contexto y el borrador transitorio de registro, recarga la interfaz para descartar formularios y fotos en memoria y conserva IndexedDB. Para volver se elige una vinculación activa. En un equipo compartido, la protección efectiva depende del usuario y bloqueo del sistema operativo.

No se implementa PIN. Un PIN en este entorno no protegería los datos frente a quien controla el navegador y podría dar una falsa sensación de seguridad. No hay contraseñas, hashes de contraseñas, tokens ni secretos de autenticación inventados.

Auditoría de almacenamiento: localStorage contiene el tema y el contexto local (solo identificadores o marca de sesión cerrada); sessionStorage conserva los identificadores de contexto por pestaña y la marca de cierre. IndexedDB conserva personas institucionales, permisos, historial y progreso. Los permisos se recalculan desde la base; nunca se confía en un perfil guardado en localStorage. El selector local no equivale a una barrera contra el propietario del dispositivo.

## Recuperar y confirmar

En un navegador vacío, “Restaurar una biblioteca existente” valida un respaldo institucional versión 5, muestra su institución y cantidades y exige escribir el nombre institucional. La transacción verifica que el destino siga vacío. Un archivo inválido no escribe datos. Los formatos antiguos de catálogo se importan después de configurar una biblioteca. Si ya hay una institución, la restauración se realiza desde Configuración con sus permisos y restricciones de circulación existentes.

Vaciar catálogo exige escribir `VACIAR`; restaurar desde Configuración exige `RESTAURAR`; las reducciones de cinco o más ejemplares exigen `REDUCIR`. Transferir y desactivar conservan la confirmación con nombre institucional. Los permisos de dominio siguen siendo obligatorios.

Si se pierde el navegador o el dispositivo, se necesita un archivo de respaldo. No hay recuperación por email, sincronización ni respaldo remoto automático. No borrar el almacenamiento ante un error. Recuperar acceso o datos explica las opciones sin simular cuentas online.

## Acompañamiento

Las guías de Biblioteca (cinco acciones), Docente (cuatro) y Autoridad (cuatro) guardan su lectura por vinculación y perfil. “Ver guía otra vez” permanece disponible. El resumen de primer día reutiliza `deriveReadiness`, incluida la recomendación de comprobar el backup. El estado de piloto se deriva de `pilotMode.enabled`.

Las altas y las invitaciones siguen siendo registros locales: no se envía correo. La importación institucional conserva vista previa y confirmación explícita para perfiles sensibles. No se fusionan personas por nombre.

## Persistencia y comprobación

No se agregan stores ni cambia IndexedDB v15. Se mantiene el respaldo v5, con campos adicionales en instituciones, settings y memberships. Los respaldos anteriores continúan admitidos. Los datos de demostración no se incorporan al onboarding real.

Pruebas: `entry.test.js`, `entry-browser.cjs`, regresión general y migraciones reales de versiones anteriores. La prueba de ingreso parte de una base vacía; las regresiones preparan explícitamente su institución de prueba. No hay bypass de primer ingreso en producción.
