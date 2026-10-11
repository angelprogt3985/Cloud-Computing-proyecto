# Preentrega — Identidades y validación continua

Documento preparado el 11 de octubre de 2026. Alcance de esta demostración: IAM y GitHub Actions. Referencia histórica: [commit 93cd5a2](https://github.com/angelprogt3985/Cloud-Computing-proyecto/tree/93cd5a2).

Esta preentrega presenta una etapa verificable del proyecto. El repositorio actual conserva integraciones adicionales desarrolladas después de esta etapa, recogidas en [entrega final](entrega-final.md). No se requiere volver a una versión anterior para mostrar estas evidencias.

## Objetivo

Preparar una forma controlada de validar el proyecto y autenticar sus automatizaciones ante Google Cloud, sin necesitar un servidor del juego encendido durante la demostración.

## IAM implementado

Se separan las cuentas `glacierquest-runtime` y `glacierquest-deploy`. Workload Identity Federation permite a un workflow de GitHub obtener una credencial temporal de la segunda identidad sin guardar una clave JSON permanente.

La configuración revisada restringe el repositorio por sus IDs numéricos, la rama `codex/preentrega-iam-actions` y el workflow `.github/workflows/verify-cloud-identity.yml`. La prueba exitosa acredita autenticación; no demuestra que esa identidad pueda desplegar ni consultar datos del juego.

Evidencia: [verificación IAM exitosa del 10 de octubre](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38103854018), commit `f4a1756`, duración total mostrada: 8 segundos.

Archivos: [workflow de identidad](../../../.github/workflows/verify-cloud-identity.yml), [definición de confianza](../../infra/terraform/iam.tf) y [registro de implementación](../06_Conexion_IAM_Actual.md).

## GitHub Actions implementado

La integración continua ejecuta pruebas, construye el contenedor sin publicarlo y valida Terraform sin aplicar infraestructura. Su utilidad es detectar errores antes de que el equipo intente desplegar.

Evidencia de la misma etapa: [CI exitosa de f4a1756](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38103853934). Archivo: [ci.yml](../../../.github/workflows/ci.yml).

El segundo workflow verifica la conexión IAM. Ninguno despliega el juego. Por tanto, Actions está implementado como CI y autenticación; **no se presenta como CD ni como despliegue automatizado**. Si la rúbrica exige despliegue desde Actions para contarlo como servicio, ese criterio no está satisfecho solo con estas ejecuciones. IAM + CI no debe presentarse automáticamente como dos servicios desplegados.

## Demostración de cinco minutos

1. Abrir la ejecución exitosa de CI y explicar pruebas, construcción y validación.
2. Abrir la ejecución de identidad y mostrar el resumen de autenticación y su commit.
3. Mostrar la restricción de repositorio, rama y workflow, sin enseñar tokens ni claves.
4. Explicar la separación entre identidad del servidor y de despliegue.
5. Presentar el alcance ampliado de la entrega final mediante el documento separado.

No hace falta volver a ejecutar workflows, crear jugadores ni abrir la demo cloud para esta exposición. Si se necesita mostrar el juego como contexto, se puede usar el modo local del código actual; se debe identificar como local y con datos temporales, no como una prueba de los servicios de nube.

## Fuera de esta demostración

Cloud Run, Storage, Secret Manager, Cloud Build, Firebase y Scheduler corresponden al alcance ampliado. Algunos ya tienen integración y evidencia en la versión actual; quedan fuera de esta presentación por alcance, no porque se afirme que aún no existen.

Explicación sugerida: «Esta preentrega se centra en la base de seguridad y validación: IAM y GitHub Actions. La implementación actual conserva avances de integración cloud que se documentan por separado para la entrega final».

