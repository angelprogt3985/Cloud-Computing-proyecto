# Despliegue futuro en Google Cloud

Guía para ejecutar cuando el equipo tenga cuenta, facturación y repositorio. No es necesario completar estas etapas para abrir la demo local. Firestore no se utiliza. Comandos de nube en Bash de Google Cloud Shell.

## 1 Proyecto y permisos

Crear un proyecto dedicado y alertas de presupuesto. Elegir us-central1 y revisar precios. La cuenta humana de bootstrap necesita administrar APIs, IAM, SQL, Run, secretos, buckets, registro y paneles. No asignar Owner ni Editor a runtime/deploy. No compartir estado Terraform por Git; usar un único operador o un backend remoto protegido.

Clonar el repositorio y entrar a glacierquest. Los workflows deben estar en .github/workflows de la raíz del repositorio. En Cloud Shell, autenticar la cuenta autorizada y el proyecto:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
```

Editar project_id, github_repository (OWNER/REPO), github_repository_id y github_owner_id. Los IDs numéricos se obtienen de la API autorizada de GitHub o del administrador del repositorio. Mantener enable_database=false y deploy_app=false para la fase de preparación. Si ya existen recursos con esos nombres, conciliarlos/importarlos antes de aplicar.

```bash
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -out=bootstrap.plan
terraform -chdir=infra/terraform apply bootstrap.plan
```

Este paso crea recursos de preparación, no la base ni la app. Revisar el plan: no ejecutar apply solo para probar la demo local. Terraform no contiene los valores de secretos.

## 2 Preparar las tres versiones de secretos

En Secret Manager, agregar versiones de glacierquest-session (clave aleatoria de al menos 32 caracteres), glacierquest-demo-code (código compartido para la clase) y glacierquest-db-password (contraseña única para el usuario SQL). No escribir valores en Git ni en el PDF. Registrar solo los números de versión y completar session_secret_version, demo_secret_version y db_secret_version en tfvars.

Se puede generar la clave de sesión sin imprimirla usando:

```bash
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add glacierquest-session --data-file=-
```

Para los otros secretos usar el formulario seguro de Secret Manager. La contraseña SQL guardada debe coincidir exactamente con la que se asignará al login glacierquest. No usar las credenciales de Compose en nube.

## 3 Habilitar Cloud SQL cuando se vaya a usar

Editar enable_database=true; conservar deploy_app=false. Revisar plan y aplicar. La instancia propuesta es PostgreSQL 16 Enterprise db-f1-micro, zona única, 10 GiB SSD. No incluye backups automáticos para esta demo; exportar antes de retirar datos. Tiene protección contra borrado.

En la consola Cloud SQL, configurar una contraseña de administrador si es necesaria y crear el usuario integrado glacierquest con la contraseña del secreto. Abrir Cloud SQL Studio como administrador, seleccionar la base glacierquest y ejecutar el contenido completo de api/sql/001-schema.sql y api/sql/002-runtime-grants.sql. Si la creación del usuario le asignó cloudsqlsuperuser, ejecutar como administrador `REVOKE cloudsqlsuperuser FROM glacierquest;`. Runtime necesita solo conexión, uso de esquema y SELECT/INSERT/UPDATE/DELETE sobre las tres tablas, no privilegios administrativos.

Studio es una opción; como alternativa usar Cloud SQL Auth Proxy oficial ligado a 127.0.0.1 y psql con un usuario administrador. No añadir una red 0.0.0.0/0. La aplicación no crea tablas al iniciar: si no se aplicó el esquema, /health devuelve fallo y hay que completar la migración.

## 4 Construir y desplegar la aplicación

Desde glacierquest, con Docker y Node disponibles en Cloud Shell:

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

Editar image con esa ruta y deploy_app=true. Confirmar que enable_database continúa true y SQL está encendida. Revisar plan y aplicar:

```bash
terraform -chdir=infra/terraform plan -out=app.plan
terraform -chdir=infra/terraform apply app.plan
URL=$(terraform -chdir=infra/terraform output -raw url)
curl --fail "$URL/health"
```

Respuesta esperada: status ok, database postgres, cloud true. Abrir la URL, entrar con código de clase, recoger objeto y recargar. Verificar la fila SQL y el banner del bucket. La URL run.app ofrece HTTPS sin comprar IP fija ni balanceador web. Si la organización bloquea acceso público allUsers, coordinar la política con su administrador; no eludirla.

## 5 CI/CD y evidencia

Crear entorno GitHub class-demo. Configurar GCP_PROJECT_ID, WIF_PROVIDER, DEPLOY_SERVICE_ACCOUNT y ASSET_BUCKET como variables, usando salidas de Terraform. Proteger main. El workflow de validación corre con push/PR; Deploy Glacier Quest se lanza manualmente desde main y actualiza el servicio existente. Utiliza OIDC; no subir claves JSON.

Guardar enlace al workflow, SHA/digest de imagen, revisión y URL. El pipeline comprueba salud SQL. Para rollback elegir la revisión anterior conocida y verificarla; Terraform ignora cambios de imagen para no revertir el despliegue de Actions. Cambiar esquema o secretos puede requerir coordinación adicional; no asumir rollback automático de datos.

## 6 Operación y cierre

Cerrar pestañas al terminar reduce polling; ocultarlas lo pausa. Cloud Run escala a cero cuando deja de recibir tráfico. Cloud SQL no escala a cero: revisar cómputo, disco e IPv4 ociosa. Detener temporalmente con sql_activation_policy=NEVER y aplicar solo tras revisar plan; volver a ALWAYS antes de una demo. Detener no garantiza factura cero.

Después de la calificación, exportar y verificar datos que se conserven. Terraform destroy requiere desactivar deliberadamente protección de SQL; además un bucket no vacío no se borra automáticamente. No eliminar recursos mientras se requiera la URL para evaluar. La limpieza es una acción posterior del equipo, no se ejecutó durante esta entrega.

## 7 Pub/Sub como etapa posterior del lab 18

Esta fase aún no está implementada. Antes de desplegarla, añadir topic glacierquest-events y suscripción pull glacierquest-activity a Terraform; agregar tablas SQL de eventos de salida e historial; guardar el evento dentro de la transacción de victoria; construir el publicador y consumidor como un Cloud Run Job de ejecución finita; asignar permisos por topic y suscripción, y mostrar el historial en la UI.

El job se ejecutará manualmente para la presentación. Publicará pendientes y procesará mensajes, con confirmación después de persistir y deduplicación por ID de batalla/evento. Comprobar recuperación ante falla de publicación y reentrega sin duplicados. No se incluyen comandos de ejecución de un job que todavía no existe. Mantener Secret Manager y Artifact Registry como apoyo, sin contarlos para completar los siete.
