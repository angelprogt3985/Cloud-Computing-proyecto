# Estado real: IAM + GitHub Actions

> Registro histórico de la etapa de identidad. La demo posterior y los permisos de sus recursos están documentados en [07: Demo cloud y créditos](07_Demo_cloud_y_creditos.md).

Actualizado el 10 de octubre de 2026. Rama de trabajo: `codex/preentrega-iam-actions`. El usuario confirmó una prueba gratuita con US$300; la captura aportada muestra 90 días. El crédito es saldo promocional, no un presupuesto que deba agotarse. Se mantiene la referencia de US$10 mensuales indicada en esta conversación. La configuración de identidad no modifica la modalidad de facturación.

## Comprobado en Google Cloud

- Proyecto activo: `glacier-quest-1791678996`, número `636305098699`.
- Se verificó acceso con la cuenta propietaria autorizada para este proyecto y facturación habilitada. La cuenta anterior no se utilizó para estas operaciones.
- Se reutilizaron `glacierquest-runtime` y `glacierquest-deploy`. No se crearon claves JSON ni se concedieron roles del juego a estas identidades.
- Se creó el pool `glacierquest-github` y el proveedor OIDC `github`, con emisor `https://token.actions.githubusercontent.com`.
- La confianza exige simultáneamente el ID de repositorio `1367518501`, el ID de propietario `162619282`, la rama `refs/heads/codex/preentrega-iam-actions` y el workflow `.github/workflows/verify-cloud-identity.yml` de esa misma rama. Los IDs se comprobaron en el resumen de la ejecución de CI existente.
- Se concedió `roles/iam.workloadIdentityUser` únicamente sobre `glacierquest-deploy` al conjunto de identidades de ese repositorio dentro del pool restringido. No se cambió el rol Editor del colaborador ni se le concedieron permisos de facturación.
- No se ejecutó `terraform apply`, ni se crearon bases de datos, buckets, imágenes o servicios de juego. Cloud Run permanece sin acceso anónimo en Terraform.

## Verificación en Actions

Estado: autenticación verificada correctamente en GitHub para el commit `f4a1756fce45af67e14514855b9b0c10d4066295`.

- [Verificación IAM exitosa](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38103854018): intercambio OIDC por token temporal de `glacierquest-deploy`, sin despliegue.
- [CI exitosa del mismo commit](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38103853934): pruebas HTTP/juego en memoria y caché, construcción Docker y validación de Terraform.
- Comprobaciones locales: sintaxis Bash, YAML, `terraform fmt -check`, `terraform validate` y `git diff --check` correctos. No se ejecutaron pruebas de una base real.

El workflow `verify-cloud-identity.yml` pide un token de acceso de 300 segundos con `google-github-actions/auth@v3`. No imprime el token, no crea un archivo de credenciales y no publica artefactos. Un resultado exitoso demuestra autenticación como `glacierquest-deploy`, no despliegue ni permisos para usar datos del juego.

La comprobación se ejecuta al subir cambios al propio archivo del workflow en esta rama. Esto permite probar sin integrar la rama en `main`: GitHub exige que un workflow exista en la rama predeterminada para habilitar su ejecución manual mediante `workflow_dispatch`. Se conserva ese disparador para cuando corresponda, pero la condición del job y del proveedor sigue restringiendo la rama autorizada.

La CI independiente valida pruebas, Docker y Terraform. Usa minutos de GitHub, sujetos a la cuota del repositorio privado. Evidencia anterior: [CI exitosa de b0f8672](https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38101380481). Esa ejecución no verificó autenticación contra GCP.

## Repetición y cambios futuros

`infra/bootstrap-identity.sh` contiene la configuración revisada y fija explícitamente la cuenta propietaria autorizada. Es un script de creación inicial, no un reconciliador: no volver a ejecutarlo sobre los recursos ya creados. Primero inspeccionar el pool, proveedor y permisos con comandos `describe` y `get-iam-policy`.

Para admitir otra rama o un workflow de despliegue hay que revisar y actualizar la confianza deliberadamente. `main`, otras ramas y otros workflows no están autorizados por esta configuración. La cuenta deploy todavía requiere permisos específicos de recursos antes de poder desplegar el juego.

## Conciliar Terraform antes de otra fase

Terraform refleja la misma rama y workflow mediante `github_branch` y `github_repository`. El módulo general también crea registro de imágenes, bucket y secretos con `deploy_app=false`; no aplicarlo para verificar identidad.

Antes de cualquier aplicación futura, importar las identidades creadas al estado protegido y revisar el plan. Desde `glacierquest/infra/terraform`, con las variables del proyecto verificadas:

```bash
terraform import google_service_account.runtime projects/glacier-quest-1791678996/serviceAccounts/glacierquest-runtime@glacier-quest-1791678996.iam.gserviceaccount.com
terraform import google_service_account.deploy projects/glacier-quest-1791678996/serviceAccounts/glacierquest-deploy@glacier-quest-1791678996.iam.gserviceaccount.com
terraform import google_iam_workload_identity_pool.github projects/glacier-quest-1791678996/locations/global/workloadIdentityPools/glacierquest-github
terraform import google_iam_workload_identity_pool_provider.github projects/glacier-quest-1791678996/locations/global/workloadIdentityPools/glacierquest-github/providers/github
```

Conciliar también el binding `google_service_account_iam_member.github`. No subir estados, tfvars ni credenciales. Los archivos anteriores del repositorio contienen propuestas de Firestore que contradicen la restricción indicada por el usuario; esta etapa de identidad no elige ni activa una base de datos.

Fuentes: [Federación con pipelines](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [acción de autenticación](https://github.com/google-github-actions/auth), [ejecución manual en GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
