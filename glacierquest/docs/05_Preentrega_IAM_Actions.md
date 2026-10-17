# Preentrega: IAM y GitHub Actions sin activar servicios facturables

> Guía histórica: el proyecto correcto es `glacier-quest-1791678996`, ya tiene facturación y las cuentas de servicio ya existen. Para el estado comprobado, los límites de gasto y el siguiente paso usar [06_Conexion_IAM_Actual.md](06_Conexion_IAM_Actual.md). No repetir la creación de cuentas ni usar el ID antiguo de esta guía.

## QuÃ© cuenta y quÃ© no

La rÃºbrica permite IAM cuando hay roles/polÃ­ticas, cuentas o identidades propios configurados y documentados. GitHub Actions se admite cuando despliega a la nube. Un workflow que solo prueba y construye es avance de CI, todavÃ­a no CI/CD integrado a efectos del conteo. No presentar esta fase como dos servicios cloud desplegados. El requisito formal de M2 sigue pendiente si exige dos servicios desplegados.

Esta entrega prepara archivos, no acredita su ejecuciÃ³n en tu cuenta. Faltan ID del proyecto y URL del repositorio, ademÃ¡s del acceso autorizado para operar en ellos. No se cambiaron las mecÃ¡nicas del juego.

## A. GitHub Actions primero: sin datos de pago ni credenciales GCP

1. Usar https://github.com/angelprogt3985/Cloud-Computing-proyecto. Si es pÃºblico, no incluir material privado ni claves. Puede ser privado, pero revisar los minutos gratuitos disponibles. No hace falta hacerlo pÃºblico para esta guÃ­a.
2. Subir el CONTENIDO del ZIP conservando `.github/workflows` en la raÃ­z junto a `glacierquest`. No subir el ZIP sin extraerlo ni poner todo dentro de otra carpeta. Si el repo ya contiene trabajo mÃ¡s reciente, integrar estos archivos sin reemplazarlo a ciegas.
3. La rama predeterminada de esta preparaciÃ³n es `main`. Subir los workflows a ella. No subir node_modules, archivos .env, credenciales ADC, terraform.tfvars ni estados de Terraform.
4. En Settings > Actions > General, permitir GitHub Actions y las acciones de terceros utilizadas si la polÃ­tica del equipo lo exige. Mantener el token con lectura de contenidos; este workflow no necesita escritura ni secretos.
5. En Actions elegir **Validate Glacier Quest**, luego **Run workflow**, rama main. Si el botÃ³n no aparece, comprobar que ci.yml estÃ¡ en la rama predeterminada y contiene workflow_dispatch.
6. Se instalan dependencias, ejecutan pruebas, construye el contenedor SIN subirlo y valida Terraform SIN aplicar infraestructura. No inicia sesiÃ³n en GCP. Tiene lÃ­mite de 15 minutos y cancela verificaciones viejas de la misma rama.
7. Guardar URL de la ejecuciÃ³n, commit, resultado de cada paso y artefacto tests.tap (retenciÃ³n 7 dÃ­as). Un paso fallido debe corregirse; no presentar una ejecuciÃ³n roja como validaciÃ³n completa.

Los tests de esta fase prueban juego/HTTP en memoria y comportamiento de cachÃ©. No prueban Firestore real, IAM ni SQL. La construcciÃ³n Docker se ejecutarÃ¡ en GitHub; no se verificÃ³ Docker localmente en esta preparaciÃ³n. La ejecuciÃ³n de GitHub todavÃ­a no ocurriÃ³ aquÃ­.

No ejecutar **Deploy Glacier Quest** ahora. Ese workflow requiere identidad federada, registro, bucket y servicio Cloud Run ya preparados. No aÃ±adir una clave JSON para esquivar esa preparaciÃ³n.

## B. IAM: configuraciÃ³n Ãºtil para el equipo

Separaremos identidades del servidor y del despliegue, y daremos a un revisor humano del equipo lectura de la configuraciÃ³n IAM. Esto permite revisar permisos sin que todos sean propietarios del proyecto. El rol personalizado entregado sirve para esa revisiÃ³n, no para leer datos de juego ni desplegar.

Como administrador del proyecto, abrir PowerShell desde glacierquest, con Google Cloud CLI instalado:

```powershell
gcloud auth login
$ProjectId = 'glacierquest'
gcloud config set project $ProjectId
gcloud projects describe $ProjectId
gcloud services enable iam.googleapis.com cloudresourcemanager.googleapis.com --project=$ProjectId
```

Ejecutar por separado y revisar cada resultado. No ejecutar Terraform general ni activar APIs de Storage, Run, SQL o secretos. Si tu proyecto o una polÃ­tica requiere facturaciÃ³n para completar una operaciÃ³n, detenerse y anotar la limitaciÃ³n; esta guÃ­a no activa facturaciÃ³n ni garantiza eliminar controles del proveedor.

Crear las identidades (si ya existen, revisar y reutilizar):

```powershell
gcloud iam service-accounts create glacierquest-runtime --display-name='Glacier Quest runtime' --project=$ProjectId
gcloud iam service-accounts create glacierquest-deploy --display-name='Glacier Quest deployment' --project=$ProjectId
gcloud iam roles create glacierquestIamReviewer --project=$ProjectId --file=infra/iam-reviewer.yaml
```

Las dos cuentas de servicio quedan SIN roles de proyecto por ahora. No darles Owner/Editor ni crear claves. Sus permisos sobre recursos concretos se aÃ±adirÃ¡n cuando esos recursos existan. Crear cuentas vacÃ­as es preparaciÃ³n, no prueba de una aplicaciÃ³n conectada.

Elegir a un integrante real encargado de revisar la arquitectura. No otorgar este rol al propietario para demostrar lÃ­mites: sus permisos de propietario se sumarÃ­an. Usar un integrante sin permisos superiores heredados:

```powershell
$ReviewerEmail = 'CORREO_REAL_DEL_REVISOR'
gcloud projects add-iam-policy-binding $ProjectId --member="user:$ReviewerEmail" --role="projects/$ProjectId/roles/glacierquestIamReviewer"
```

Si no hay un segundo integrante disponible, guardar la configuraciÃ³n pendiente de asignaciÃ³n y prueba; no inventar usuarios. Una polÃ­tica de organizaciÃ³n puede limitar a quiÃ©n se invita. El administrador necesita permisos para crear cuentas, roles y cambiar IAM; no conceder permisos amplios a runtime para resolver un error del administrador.

## C. Verificar IAM sin modificar ni borrar recursos

El revisor inicia sesiÃ³n en SU equipo con SU cuenta:

```powershell
gcloud auth login
$ProjectId = 'glacierquest'
gcloud projects get-iam-policy $ProjectId --format=json
gcloud iam service-accounts list --project=$ProjectId
```

Debe poder leer la polÃ­tica y listar las dos identidades. Para comprobar que no puede cambiar polÃ­ticas ni crear claves, puede consultar sus permisos mediante el endpoint testIamPermissions (no modifica nada):

```powershell
$AccessToken = gcloud auth print-access-token
if ($LASTEXITCODE -ne 0) { throw 'No se pudo autenticar al revisor' }
try {
  $Body = @{ permissions = @('resourcemanager.projects.getIamPolicy','resourcemanager.projects.setIamPolicy','iam.serviceAccounts.create','iam.serviceAccountKeys.create') } | ConvertTo-Json
  $Result = Invoke-RestMethod -Method Post -Uri "https://cloudresourcemanager.googleapis.com/v1/projects/${ProjectId}:testIamPermissions" -Headers @{ Authorization = "Bearer $AccessToken" } -ContentType 'application/json' -Body $Body
  $Result | ConvertTo-Json
} finally {
  $AccessToken = $null
}
```

Se espera getIamPolicy y no los tres permisos de escritura. Si aparecen permisos adicionales, revisar roles heredados/grupos. Esta consulta comprueba permisos de proyecto, no todos los posibles permisos individuales sobre cada recurso. No imprimir ni capturar el token. Registrar fecha, cuenta revisora, rol y resultado. No borrar usuarios ni intentar cambiar la polÃ­tica como prueba negativa.

## D. Evidencia para presentar

| Elemento | Evidencia | Estado antes de ejecutarlo |
|---|---|---|
| SeparaciÃ³n de identidades | runtime y deploy, sin claves ni Owner/Editor | Archivos/instrucciones preparados |
| Rol de revisiÃ³n IAM | Permisos del rol y asignaciÃ³n al integrante | Pendiente en GCP |
| LÃ­mite de acceso | Lectura exitosa y resultado testIamPermissions | Pendiente en GCP |
| CI en GitHub | EjecuciÃ³n verde, commit y reporte descargable | Workflow preparado; pendiente de ejecuciÃ³n |
| Despliegue desde Actions | RevisiÃ³n cloud creada por el pipeline | Pendiente de facturaciÃ³n/infraestructura y WIF |

Frase para exponer una vez hechas las pruebas reales: Â«Configuramos IAM con identidades separadas y revisiÃ³n de permisos de solo lectura. GitHub Actions valida pruebas, imagen y Terraform; el despliegue automÃ¡tico es la siguiente etapaÂ». No decir que Actions ya despliega si solo pasÃ³ CI.

## E. ConexiÃ³n futura entre Actions y GCP

La guÃ­a oficial de Workload Identity Federation para pipelines incluye habilitar facturaciÃ³n como prerrequisito. Por eso no se promete hoy conexiÃ³n GitHub->GCP sin facturaciÃ³n. Queda preparado el workflow de despliegue anterior; despuÃ©s se configurarÃ¡n WIF restringido a repositorio/propietario/main, permisos sobre recursos y variables GCP_PROJECT_ID, WIF_PROVIDER, DEPLOY_SERVICE_ACCOUNT y ASSET_BUCKET.

Los recursos IAM creados manualmente deben importarse/conciliarse antes de aplicar Terraform, pues el mÃ³dulo general utiliza los mismos nombres de runtime y deploy. No ejecutar apply ahora para intentar completar IAM: ese mÃ³dulo tambiÃ©n prepara otros servicios.

## Costos y fuentes

Esta fase no aprovisiona cÃ³mputo, almacenamiento cloud ni bases pagadas. GitHub ofrece runners estÃ¡ndar gratuitos para repositorios pÃºblicos y una cuota incluida para privados; usar el runner ubuntu-latest y revisar la cuota de la cuenta. Se conserva solo un reporte pequeÃ±o durante siete dÃ­as. NingÃºn workflow preparado equivale a ejecuciÃ³n o facturaciÃ³n ya realizada.

- RÃºbrica: _2026__Course_Project.docx facilitado por el equipo.
- Cuentas IAM: https://docs.cloud.google.com/iam/docs/service-accounts-create
- Roles personalizados: https://docs.cloud.google.com/iam/docs/creating-custom-roles
- EjecuciÃ³n manual Actions: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- WIF y requisito de facturaciÃ³n: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Actions y cuotas: https://docs.github.com/en/billing/concepts/product-billing/github-actions
