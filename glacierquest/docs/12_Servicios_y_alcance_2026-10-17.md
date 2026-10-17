# Servicios: revisión de la base recibida y alcance de la comprobación

Fecha: 17 de octubre de 2026, Guatemala. Proyecto: `glacier-quest-1791678996`.

Se revisó el código recibido en `Cloud Computing proyecto.zip`, sus workflows, los documentos 09–11 y el informe `output/cloud-verification/servicios-verificados.json`. Esta revisión distingue implementación, evidencia histórica y disponibilidad actual. No sustituye una prueba de integración de todas las funciones publicadas.

## Resultado y evidencia

Los siete componentes del plan tienen una función concreta implementada. No se añadieron servicios para aumentar el conteo.

| Componente | Función en el proyecto | Evidencia recibida |
| --- | --- | --- |
| Cloud Run | Ejecuta el cliente y la API; valida sesiones, movimientos, progreso y combates. | Informe del 16 de octubre: revisión lista, página y API saludables. |
| Cloud Storage | Mantiene el recurso gráfico en un bucket privado; la API lo entrega al jugador. | Informe: contenido servido idéntico al objeto del bucket; lectura pública directa rechazada. |
| IAM | Separa identidades de ejecución, construcción y limpieza; permite acceso autenticado a recursos y federación desde GitHub. | Informe: identidades dedicadas, permisos configurados y rechazo de solicitudes indebidas. |
| Secret Manager | Suministra la clave de firma de sesiones y el código de clase. | Informe: versiones habilitadas y referencias en la revisión; código incorrecto rechazado. |
| Cloud Build | Construye el contenedor que se publica. | Build exitoso cuyo digest coincide con la imagen de la revisión examinada. |
| Logging + Monitoring | Recoge solicitudes, errores y limpieza; muestra tráfico, latencia, instancias y memoria. | Informe: logs estructurados y datos en las cuatro gráficas del panel. |
| Cloud Scheduler | Llama al endpoint protegido por OIDC para retirar presencia caducada y mensajes vencidos. | Informe: job habilitado y último estado correcto. El documento 11 registra además una prueba de efectos sobre datos desechables. |

El informe está fechado **16 de octubre de 2026, 13:34 de Guatemala**, y corresponde a la revisión `glacierquest-demo-00006-k72`, construida mediante `7d0447d8-a6cb-486b-8583-718e96febacf`. Es evidencia histórica incluida en los archivos. No se volvieron a ejecutar los scripts de verificación de servicios ni de Scheduler.

Se intentó una única consulta de lectura a `/health` de la URL documentada mediante la herramienta web. La herramienta respondió que la URL no era accesible a través de ella; **no proporcionó una respuesta HTTP del servidor**. Por tanto, no puede confirmarse ni descartarse la disponibilidad actual del despliegue a partir de ese intento. No se repitió por otro medio, no se iniciaron sesiones y no se crearon jugadores.

El documento 10 señala que parte de la interfaz recibida contiene ajustes locales posteriores al despliegue. No hay evidencia suficiente para afirmar que todos los archivos actuales del ZIP estén publicados. Las mejoras locales de esta sesión necesitarán un despliegue posterior para aparecer en el servidor.

## Componentes de apoyo

- **Firebase Authentication:** registro, acceso y recuperación de cuentas. El servidor verifica la identidad antes de emitir una sesión del juego.
- **Firebase Realtime Database:** progreso recuperable, presencia, mensajes temporales y estado compartido de la arena. Las operaciones de jugador y arena utilizan ETag para resolver concurrencia.
- **Artifact Registry:** almacena las imágenes que utiliza Cloud Run.
- **GitHub Actions:** ejecuta pruebas locales, construcción de contenedor sin publicar y validación de Terraform. Un workflow separado comprueba la federación de identidad; estos workflows no despliegan el juego.

Firebase se mantiene fuera del conteo académico acordado. El conteo de Logging + Monitoring como una sola entrada y la aceptación de cada componente dependen del criterio del docente. Los adaptadores SQL/Firestore y el Terraform de etapas anteriores no son evidencia de que esos servicios estén activos.

## Presupuesto y operación

Se conserva el objetivo de aproximadamente **US$10 en todo el proyecto**, procurando no superar **US$20**. Los US$300 promocionales no son el presupuesto que se desea consumir. Esta revisión no consultó facturación y no puede certificar el gasto acumulado ni el saldo restante. Las alertas mensuales no equivalen a un límite acumulado ni detienen recursos automáticamente.

Los scripts de despliegue existentes fijan Cloud Run en mínimo cero y máximo una instancia, 1 CPU, 512 MiB y facturación ligada a solicitudes. Son controles de capacidad; **no constituyen un tope monetario**. El código suspende la sincronización en la portada y en pestañas ocultas, pero los jugadores activos siguen generando solicitudes y tráfico de datos.

Scheduler está configurado para ejecutarse cada hora, incluso sin jugadores. Sus solicitudes pueden activar Cloud Run. Los archivos recibidos no demuestran que el job esté pausado hoy. El almacenamiento de imágenes, objetos y datos también continúa existiendo entre demostraciones. No se modificaron recursos cloud, trabajos programados, permisos ni facturación durante esta revisión.

Para contener el consumo:

1. Desarrollar y probar reglas, interfaz, chat y persistencia simulada localmente. El inicio local debe aislar las variables cloud heredadas para que acceder por correo no contacte Firebase accidentalmente.
2. Reutilizar la sincronización existente para las funciones nuevas. Varias zonas no requieren una instancia, una base o un servicio nuevo por zona.
3. Compartir la caché del recurso de Storage entre el panel técnico y el recurso gráfico; consultar el panel no debería descargar repetidamente el mismo objeto.
4. Desplegar un conjunto funcional significativo después de sus pruebas locales. Comprobar en una sesión breve las integraciones que ese conjunto modifica.
5. Al terminar una demostración, cerrar los clientes y revisar el procedimiento de pausa del job. Pausar Scheduler reduce actividad automática, pero no borra almacenamiento ni garantiza gasto cero. Reanudarlo antes de una demostración que deba evidenciar la limpieza.

## Hallazgos de la base recibida

- El chat devolvía los últimos 30 mensajes sin filtro de antigüedad. La limpieza eliminaba mensajes de más de siete días, con un máximo de 20 por colección y ejecución. Esto explica que un recién llegado pudiera ver conversaciones de días anteriores. La solución debe aplicar visibilidad y vencimiento en el servidor, además de limitar lo mostrado en pantalla.
- Los mensajes no incluían el identificador del emisor. Asociar burbujas por nombre confundiría jugadores con nombres iguales; deben asociarse por identificador estable.
- El rol de acceso a Realtime Database incluye `firebasedatabase.instances.update`, que también permite cambios de reglas. El propio archivo de rol reconoce este alcance: no debe describirse como un permiso exclusivamente de lectura/escritura de datos.
- Las pruebas reales históricas no deben repetirse automáticamente por cambios cosméticos. `verify-services.py` crea datos temporales y `verify-scheduler.py` dispara el job: ambos requieren una sesión de verificación cloud deliberada.

Este documento registra la auditoría de la base recibida. El resumen de cambios y pruebas locales de la sesión debe consultarse junto con él; una prueba local aprobada no debe presentarse como una nueva verificación cloud.
