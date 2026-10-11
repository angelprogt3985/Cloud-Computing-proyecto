# Entrega final — Integraciones y cierre pendiente

Auditoría de lectura: 11 de octubre de 2026. Base de código: `a3156be`. No se desplegaron recursos, ejecutaron jobs ni modificaron datos para preparar este documento.

## Estado por servicio

| Servicio | Estado y función | Evidencia disponible / límite de la comprobación |
| --- | --- | --- |
| IAM | Implementado: identidades y autenticación federada. Continúa siendo base de la etapa final. | Ejecución OIDC exitosa comprobada en GitHub; permisos de runtime documentados en 07–08. No se volvió a auditar cada binding. |
| GitHub Actions | Implementado como CI y verificación de identidad. Despliegue desde Actions pendiente. | Ejecuciones reales exitosas. Workflows raíz no despliegan. |
| Cloud Run | Desplegado: ejecuta web y API. | Consola revisada: `glacierquest-demo` saludable y entregando tráfico en `us-central1`. |
| Cloud Storage | Integración implementada para el recurso visual. | Bucket `glacier-quest-1791678996-demo-assets` referenciado en Cloud Run y en el código; prueba real reportada en 07–08. No se descargó el objeto en esta auditoría. |
| Secret Manager | Integración configurada en el servicio desplegado. | Consola revisada: `SESSION_SECRET` y `DEMO_CODE` referencian los dos secretos de demo, versión 1. No se leyeron sus valores. |
| Cloud Build | Construcción implementada por separado de Actions. | Configuración y builds exitosos reportados en 07–08; imagen por digest visible en Cloud Run. No se inició otro build. |
| Artifact Registry | Almacenamiento de la imagen que ejecuta Cloud Run; apoyo técnico. | Digest desplegado en repositorio `glacierquest-demo`. No se añade al conteo por defecto. |
| Firebase Realtime Database | Persistencia implementada; fuera del conteo académico acordado. | Consola de Run: `STORE=realtime` y URL de base configurada. Pruebas de persistencia y denegación anónima reportadas en 08; no se leyeron datos de jugadores. |
| Cloud Scheduler | Implementado y habilitado: limpieza horaria. | Consola revisada: `glacierquest-cleanup`, estado Enabled, última ejecución sin errores el 11/10/2026 a las 00:17:09, hora de Guatemala. |
| Logging + Monitoring | Instrumentación y métricas básicas disponibles; cierre de evidencia pendiente. | Logs JSON en código. Consola revisada: métricas reales de solicitudes y latencia; falta consolidar panel, consulta útil y demostración. |
| Cloud Tasks / Pub/Sub | No forman parte de la integración actual revisada. | No declararlos implementados; no son necesarios para el plan de siete de 08. |
| Cloud SQL / Firestore | Alternativas presentes en archivos, no son la base de la demo actual. | No confundir los adaptadores o Terraform con servicios desplegados. No se usan como evidencia de esta demo. |
| Terraform | Configuración disponible, no despliegue reproducible conciliado. | La infraestructura real usa nombres y Firebase distintos del módulo general; importar y conciliar antes de aplicar. |

Las filas distinguen inspección directa de reportes del propietario. El código y una API habilitada por sí solos no prueban que un servicio esté operativo.

Scheduler está configurado con `17 * * * *` en `Etc/UTC`, destino `/internal/cleanup`. La consola confirma una ejecución sin errores; la conservación del progreso y la denegación de llamadas no autorizadas se apoyan en las pruebas reportadas en 08 y el código revisado, no en una nueva prueba con datos reales.

## Plan académico

Se conserva el plan documentado por el propietario: Cloud Run, Cloud Storage, IAM, Secret Manager, Cloud Build, Logging + Monitoring como uno y Cloud Scheduler. Firebase queda fuera del conteo. Actions y Artifact Registry sirven de apoyo, sin necesitar contarlos para completar los siete.

La aceptación final requiere demostrar el uso de cada servicio. Si se decide contar Actions, se necesita atender lo que exija la rúbrica sobre despliegue; autenticación no equivale a despliegue.

## Trabajo real pendiente para cerrar la entrega

- Consolidar evidencia de cada servicio con recurso, revisión, fecha y resultado reproducible.
- Preparar un panel/consulta de observabilidad que explique solicitudes, errores y latencia. El dashboard Terraform existente filtra `glacierquest`, mientras que la demo se llama `glacierquest-demo`; no asumir que observa la demo.
- Ensayar la presentación con varios clientes y verificar persistencia y limpieza con datos de prueba acotados.
- Conciliar infraestructura real y Terraform. No ejecutar el módulo general a ciegas.
- Verificar si las mejoras de sincronización del commit `a3156be` están en la imagen desplegada: la consola mostró el digest `ae5c41d2e74c934e0547689ab8cb0c1e13a1ecd6ea8824bbf0317ca76716f026`, el mismo registrado en 08 antes de ese commit. No hay evidencia revisada de un nuevo despliegue de esa mejora.
- Decidir si se añade despliegue manual desde Actions; hoy el despliegue se realiza con Cloud Build y gcloud.
- Revisar el presupuesto acumulado y acordar ventanas de prueba y cierre.

## Alcance, acceso y gasto

Clasificar estos avances para la entrega final no apaga los recursos. El documento 07 registra acceso anónimo de Cloud Run con código de clase en la aplicación; ese código no convierte el servicio en privado a nivel IAM. Esta auditoría no cambió esa configuración.

Objetivo vigente del usuario: US$20 para todo el proyecto. La alerta histórica de US$10 mensuales no equivale a ese límite acumulado ni detiene automáticamente el consumo. No se comprobó el saldo actual en esta revisión.

Una tarea horaria puede invocar el servidor aunque no haya jugadores. Para reducir actividad entre pruebas se debe acordar pausar Scheduler, controlar el acceso y revisar almacenamiento residual. No se pausó ni eliminó infraestructura durante esta separación documental.

## Fuentes internas y evidencia

- [IAM desde Actions](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38103854018).
- [CI de la versión revisada](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38115826092).
- [Estado de identidad](../06_Conexion_IAM_Actual.md).
- [Demo y créditos](../07_Demo_cloud_y_creditos.md).
- [Firebase y Scheduler](../08_Firebase_y_Scheduler.md).
- [Cloud Run en consola](https://console.cloud.google.com/run/detail/us-central1/glacierquest-demo?project=glacier-quest-1791678996).

