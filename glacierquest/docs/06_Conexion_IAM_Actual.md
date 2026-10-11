# Estado real y siguiente paso: IAM + Actions

Actualizado el 10 de octubre de 2026. Presupuesto objetivo del proyecto: US$20 en total, no los US$300 del crédito. El juego permanece sin desplegar; no se habilita acceso público.

## Lo comprobado

- Proyecto: `glacier-quest-1791678996`, número `636305098699`.
- Creadas `glacierquest-runtime` y `glacierquest-deploy`, ambas sin claves. No se les han asignado permisos de juego.
- La sesión de Pablo tiene rol Editor; el propietario es Ángel. La consola deniega `iam.workloadIdentityPools.create` y `iam.workloadIdentityPoolProviders.create`, y no permite modificar IAM del proyecto.
- GitHub Actions ejecutó correctamente pruebas del juego/HTTP en memoria, construcción Docker y validación de Terraform: https://github.com/angelprogt3985/Cloud-Computing-proyecto/actions/runs/38101380481 (commit b0f8672).
- IDs comprobados en el resumen de esa ejecución: repositorio `1367518501`, propietario `162619282`.
- Se eliminó el permiso `allUsers` del Terraform de Cloud Run y se redujo el máximo previsto de instancias a una. El mínimo sigue en cero, facturación por solicitudes. Son cambios de configuración, no un despliegue.
- Se inició la habilitación de APIs de identidad desde la consola. La federación NO está creada ni probada.

## Función útil de cada parte

IAM separa la identidad del servidor y la del proceso de entrega. La federación admitirá únicamente tokens del repositorio del equipo y de `main`, evitando claves JSON permanentes. No se otorga Owner/Editor a cuentas de servicio.

Actions detecta cambios que rompen pruebas, empaquetado o Terraform. El workflow `verify-cloud-identity.yml` es manual y solicita un token temporal de cinco minutos; no lo imprime ni lo guarda como artefacto. Solo prueba autenticación, no permisos sobre recursos ni despliegue. Debe integrarse en `main` y configurarse la federación antes de ejecutarlo.

Estas verificaciones no consumen crédito GCP por ejecución del juego. Usan minutos de GitHub, sujetos a la cuota de la cuenta propietaria del repositorio privado. Revisar esa cuota antes de pruebas numerosas. Actions todavía no acredita el requisito académico de desplegar a la nube: esa demostración queda pendiente.

## Paso del propietario, sin compartir su cuenta

Ángel puede revisar y ejecutar `infra/bootstrap-identity.sh` en su propia sesión de Cloud Shell, dentro de este proyecto:

```bash
bash glacierquest/infra/bootstrap-identity.sh
```

Debe ejecutar la copia de este archivo correspondiente a la rama revisada. El script verifica el número de proyecto, reutiliza la cuenta deploy, habilita solo APIs IAM/credenciales/STS, crea el pool y proveedor, y concede `roles/iam.workloadIdentityUser` únicamente sobre la cuenta deploy al repositorio identificado. No concede permisos para bases, secretos, almacenamiento ni ejecución. No crea el juego ni modifica facturación. Se detiene ante errores; si queda incompleto, inspeccionar los recursos antes de repetirlo, porque no es un reconciliador de recursos existentes.

No hace falta conceder acceso a Google Accounts, compartir contraseñas ni dar Owner a Pablo. Alternativamente, el propietario puede delegar los permisos administrativos estrictamente necesarios, pero eso requiere acordar una ampliación de acceso aparte.

Después: integrar la rama revisada en `main`, ejecutar manualmente **Verify Google Cloud identity (no deployment)** desde Actions y guardar su URL exitosa. No ejecutar Terraform apply general para resolver la federación.

## Conciliar con Terraform antes de desplegar en otra fase

El módulo general crea también registro de imágenes, bucket y secretos incluso con `deploy_app=false`; por eso NO es un módulo de identidad sin recursos facturables. No aplicarlo ahora.

Las dos cuentas ya creadas y, después del bootstrap, la federación deben importarse al estado antes de planificar el módulo general. Ejemplos desde `glacierquest/infra/terraform`, con variables verificadas y un estado protegido:

```bash
terraform import google_service_account.runtime projects/glacier-quest-1791678996/serviceAccounts/glacierquest-runtime@glacier-quest-1791678996.iam.gserviceaccount.com
terraform import google_service_account.deploy projects/glacier-quest-1791678996/serviceAccounts/glacierquest-deploy@glacier-quest-1791678996.iam.gserviceaccount.com
terraform import google_iam_workload_identity_pool.github projects/glacier-quest-1791678996/locations/global/workloadIdentityPools/glacierquest-github
terraform import google_iam_workload_identity_pool_provider.github projects/glacier-quest-1791678996/locations/global/workloadIdentityPools/glacierquest-github/providers/github
```

Conciliar también el binding existente `google_service_account_iam_member.github` y revisar el plan antes de cualquier aplicación. No subir estados, tfvars ni credenciales al repositorio.

## Control de gasto para la siguiente fase

No hay workflow de despliegue activado en esta rama. La verificación de identidad no ejecuta Terraform ni publica imágenes. Los permisos del servidor sobre datos y secretos se concederán solo cuando existan los recursos y se necesiten para una prueba.

Antes de cada prueba real: identificar cargos posibles, duración y procedimiento de cierre. Al terminar: detener disparadores, retirar ejecución innecesaria y revisar almacenamiento residual. Escalar a cero no elimina cargos de otros servicios. Una alerta de presupuesto tampoco bloquea cargos automáticamente; el máximo de una instancia no es un tope de dinero.

El acceso de la clase se acordará por separado, con identidades autorizadas. El Terraform no concede acceso anónimo. No se cambiaron las mecánicas del juego.

Fuentes: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines y https://github.com/google-github-actions/auth
