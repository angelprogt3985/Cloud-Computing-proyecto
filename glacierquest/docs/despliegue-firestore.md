> Actualizaci�n: ver [gu�a vigente desde cero](04_Conexion_paso_a_paso.md). Tasks y Scheduler sustituyen el plan anterior de Pub/Sub; ambos siguen pendientes. No aplicar Terraform sobre recursos creados manualmente sin importarlos.

# Preparar la versión económica

Esta guía sustituye los pasos SQL para la aplicación actual. No se ha ejecutado un despliegue en la cuenta del equipo. Plan y costos: [arquitectura económica](03_Arquitectura_economica.md).

## Local sin costo cloud

`start-local.cmd` conserva el modo memoria. Para probar Firestore usar el emulador oficial, no credenciales de producción. Con Google Cloud CLI y su componente de emuladores instalado, iniciar en una terminal:

```powershell
gcloud emulators firestore start --host-port=127.0.0.1:8085
```

En otra terminal, desde glacierquest:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
$env:GOOGLE_CLOUD_PROJECT='demo-glacierquest'
$env:STORE='firestore'
npm ci --ignore-scripts --prefix api
npm run test:firestore --prefix api
npm start --prefix api
```

La prueba de integración exige localhost y un proyecto de demo. No ejecutarla contra una base real. Sin FIRESTORE_EMULATOR_HOST se omite y eso no es un resultado aprobado. El emulador no comprueba los permisos IAM de producción y no debe exponerse a internet. Abrir http://localhost:8080.

## Preparación cloud

1. Usar un proyecto dedicado y confirmar la cuenta de facturación y alertas. Autenticarse con gcloud y ADC para Terraform. No subir claves JSON al repositorio.
2. Copiar infra/terraform/terraform.tfvars.example a terraform.tfvars y completar IDs reales del proyecto, repositorio y propietario. Mantener enable_database=false, enable_firestore=false y deploy_app=false inicialmente. Revisar el plan antes de aplicar: se crean también recursos de apoyo aunque la app esté desactivada.
3. Habilitar enable_firestore=true, revisar y aplicar un nuevo plan. Si la base (default) ya existe, importar/conciliar su configuración primero; no intentar recrearla. La región no se elige de nuevo arbitrariamente para una base existente.
4. Crear versiones de los secretos glacierquest-session (aleatorio, al menos 32 caracteres) y glacierquest-demo-code. Ingresar valores mediante archivos temporales locales fuera de Git o una interfaz segura. Registrar solo números de versión, nunca valores, en la configuración. No se necesita secreto SQL.
5. Construir Dockerfile desde glacierquest, subir imagen al repositorio Artifact Registry que devuelve Terraform y subir assets/glacier-banner.svg al bucket de salida. Configurar image y las dos versiones de secreto; activar deploy_app=true y revisar/aplicar el plan.
6. Revisar /health: status=ok, database=firestore y cloud=true. Entrar al juego, recoger un objeto, recargar conservando el token, y comprobar el documento en Firestore. Verificar el recurso del bucket y una petición en Logging.
7. Configurar variables de GitHub GCP_PROJECT_ID, ASSET_BUCKET, WIF_PROVIDER y DEPLOY_SERVICE_ACCOUNT a partir de las salidas. Usar environment class-demo y ejecutar Deploy Glacier Quest desde main. El workflow actual usa us-central1; si se cambia región, cambiar también ese valor.
8. Pub/Sub todavía no tiene recursos ni consumidor implementados. Seguir la secuencia y pruebas de la arquitectura económica antes de contarlo como integrado.

Comandos Terraform desde glacierquest (cada apply requiere haber revisado el plan real):

```powershell
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan
```

No aplicar esta configuración encima de infraestructura anterior sin conciliar el estado. Cambió el modo de base y algunos recursos SQL ahora son condicionales: un plan antiguo puede proponer eliminar recursos o secretos. Conservar datos y revisar/importar/mover direcciones de estado cuando corresponda. Este trabajo no hizo migración SQL->Firestore ni destruyó recursos. Las protecciones de borrado no sustituyen backups.
