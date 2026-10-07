# Despliegue paso a paso

Estado: código preparado; hace falta el proyecto GCP con facturación y el repositorio de GitHub. No se creó infraestructura ni se gastó crédito en esta iteración. Comandos de nube escritos para Bash en Google Cloud Shell. Para el juego local, ver README.

## 1 Preparar la cuenta

Crear o seleccionar un proyecto dedicado, habilitar facturación y crear alertas de presupuesto de USD 5 y USD 10. Un presupuesto avisa; no corta el gasto. Elegir `us-central1` para mantener los recursos juntos y usar cuotas gratuitas regionales cuando apliquen. No crear Firebase.

La persona que prepara infraestructura necesita permisos para habilitar APIs, crear Firestore, buckets, secretos, repositorios, Cloud Run, paneles e identidades y configurar sus políticas IAM. Usar una cuenta administradora temporal del proyecto de clase para bootstrap; no asignar Owner o Editor a las cuentas de la aplicación o CI. La organización puede impedir `allUsers`: en ese caso resolver la política con su administrador antes de publicar.

En Cloud Shell, clonar el repositorio y entrar a `glacierquest`. Terraform y Docker deben estar disponibles. Los workflows deben estar en `.github/workflows` de la RAÍZ del repositorio, al mismo nivel que `glacierquest`, no dentro de esa carpeta. Si cambian la estructura, ajustar sus rutas.

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

Editar `terraform.tfvars`: project_id, OWNER/REPOSITORY, ID numérico del repositorio y del propietario. Se obtienen desde `https://api.github.com/repos/OWNER/REPOSITORY` (campos id y owner.id) con acceso autorizado. No son secretos. Mantener `deploy_app=false`. Si ya existe Firestore `(default)`, importarlo antes de aplicar y ajustar región al recurso existente; su ubicación no se cambia en sitio.

```bash
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
# SOLO si la base ya existe, sustituir el ID:
# terraform -chdir=infra/terraform import google_firestore_database.game 'projects/YOUR_PROJECT_ID/databases/(default)'
terraform -chdir=infra/terraform plan -out=bootstrap.plan
terraform -chdir=infra/terraform apply bootstrap.plan
```

Revisar el plan antes de aplicarlo. Guardar el estado de Terraform fuera de Git y compartirlo con control de acceso. Esta versión usa estado local; para colaborar, migrarlo después a un backend GCS protegido y con versionado. No ejecutar dos apply simultáneamente.

## 2 Añadir secretos sin guardarlos en Git ni Terraform

Ejecutar una vez después del bootstrap. La clave se genera sin imprimirla. Elegir un código privado para la clase; no reutilizar contraseñas personales. Las versiones nuevas comienzan normalmente en 1; verificar los números devueltos y ajustar `session_secret_version` y `demo_secret_version` en tfvars. No usar `latest` para una rotación silenciosa.

```bash
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add glacierquest-session --data-file=-
read -rs -p 'Código para la clase: ' CLASS_CODE
printf '%s' "$CLASS_CODE" | gcloud secrets versions add glacierquest-demo-code --data-file=-
unset CLASS_CODE
```

## 3 Construir la imagen y desplegar

Desde `glacierquest`, en Cloud Shell:

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/glacierquest/game:initial"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
npm ci --ignore-scripts --prefix api
npm test --prefix api
docker build -t "$IMAGE" .
docker push "$IMAGE"
```

Editar `terraform.tfvars`: `deploy_app=true`, `image` con la ruta subida y las versiones de secretos correctas. IAM puede tardar unos minutos en propagarse; si hay un 403 al crear la revisión, revisar el binding y reintentar después de su propagación.

```bash
terraform -chdir=infra/terraform plan -out=app.plan
terraform -chdir=infra/terraform apply app.plan
URL=$(terraform -chdir=infra/terraform output -raw url)
curl --fail "$URL/health"
```

Esperado: status ok, database firestore, cloud true. Abrir URL, introducir código de clase y recoger una moneda. Recargar la pestaña y comprobar el inventario. Revisar Firestore en GCP, el banner en Storage y una petición en Logging. Si una dependencia falla, reparar la conexión; no cambiar a memoria para aparentar un despliegue funcional.

## 4 Activar CI y CD

Crear el entorno GitHub `class-demo` y estas variables de repositorio o entorno, tomadas de las salidas de Terraform: GCP_PROJECT_ID, WIF_PROVIDER, DEPLOY_SERVICE_ACCOUNT y ASSET_BUCKET. No subir un archivo JSON de clave de cuenta de servicio.

El workflow `Validate Glacier Quest` corre con push/PR y ejecuta pruebas, build Docker y validación Terraform. `Deploy Glacier Quest` se lanza manualmente desde Actions en main; vuelve a probar, obtiene credenciales temporales por OIDC, sube imagen con SHA, actualiza el banner y la revisión existente, y verifica `/health`. El despliegue manual evita publicar cada experimento o gastar minutos de CI innecesarios. Habilitar aprobación del entorno si el equipo la necesita.

Terraform ignora cambios de la imagen después de crear Cloud Run para que un apply de infraestructura no revierta el despliegue de Actions. Para rollback, elegir la revisión anterior en Cloud Run o reasignar tráfico explícitamente. Conservar una imagen conocida y verificar salud después de revertir. Cambiar la clave de firma invalida sesiones existentes; planificar esa rotación fuera de la presentación.

## 5 Evidencias para M2

Capturar URL, proyecto seleccionado, revisión Cloud Run y `/health`. Capturar el documento Firestore antes y después de recolectar o ganar. Adjuntar diagrama y lista de servicios con estado real. Esto prueba al menos cómputo y base de datos. No mostrar valores de secretos ni tokens del navegador. Guardar fecha, commit y responsable de cada prueba en `docs/evidence.md`.

## 6 Cierre y costos

Cerrar las pestañas al terminar: una pestaña visible sigue sincronizando aunque el jugador esté quieto. Ocultarla pausa el polling. Cloud Run puede bajar a cero, pero esto no es un tope monetario. No configurar uptime checks que despierten la app cada minuto sin necesidad. La política del registro retiene tres versiones recientes y elimina las viejas de más de siete días; vigilar su almacenamiento.

Antes de retirar el proyecto, exportar lo que deban conservar. `terraform destroy` no es un botón de apagado: Firestore tiene protección y política ABANDON; un bucket no vacío tampoco se elimina automáticamente. Revisar y borrar esos recursos de forma deliberada tras la calificación. No borrar el proyecto antes de entregar el video y la URL.
