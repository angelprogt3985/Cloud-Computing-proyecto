# Conectar los primeros servicios de Glacier Quest

Plan vigente, 10 de octubre de 2026. Partimos sin proyecto GCP ni facturación. Esta guía no significa que los recursos ya estén desplegados. Sustituye la selección anterior de Pub/Sub: ahora se prevén Cloud Tasks y Cloud Scheduler. No se modifican combate, movimiento ni otras mecánicas en esta etapa.

## 1. Selección y alcance

Ocho candidatos al conteo: Cloud Run, Cloud Storage, IAM, Secret Manager, Observabilidad (Logging + Monitoring juntos), GitHub Actions, Cloud Tasks y Cloud Scheduler. Firestore es la base, fuera del conteo por decisión del equipo. Artifact Registry guarda imágenes como apoyo. No es necesario desplegar los ocho ahora ni afirmar que ya cumplen la rúbrica: hace falta demostrar cada integración.

Chat: mantener Firestore es una decisión de alcance y costo operativo, no afirmar que no existen servicios útiles. Firestore admite suscripciones; Realtime Database es útil para presencia y chat, pero añade otra base y tampoco cuenta. El chat actual aún consulta mediante API y caché; no tiene suscripciones en tiempo real. Activarlas después requiere autenticación de navegador y reglas que permitan solo lectura de la sala; los envíos seguirían validados por la API. No habilitar escrituras públicas para obtener tiempo real. Pub/Sub comunica servidores y no sustituye por sí solo un chat con historial, permisos y entrega al navegador. No conectar Pub/Sub y Tasks para realizar exactamente el mismo trabajo.

Primera sesión: IAM + Cloud Storage + Secret Manager, usados por el servidor en tu computadora. No necesitamos Firestore, Cloud Run, Docker ni GitHub para esa prueba. Es integración real con nube, pero NO es alojamiento cloud ni cumple por sí sola una exigencia de URL pública. La aceptación académica de Secret Manager debe basarse en su uso demostrado, no en que aparezca en un panel.

Segunda sesión: Firestore y Cloud Run, reutilizando los tres anteriores. Allí queda una URL HTTPS y servicios de aplicación desplegados.

## 2. Crear cuenta, proyecto y presupuesto

1. Abrir https://console.cloud.google.com/ con una cuenta del equipo. Crear un proyecto dedicado llamado Glacier Quest desde el selector de proyectos. Guardar su **ID**, que no es necesariamente el nombre visible ni el número del proyecto.
2. En Facturación, crear o asociar una cuenta de facturación siguiendo la verificación del proveedor. Puede pedir medio de pago. No asumir elegibilidad para créditos y no seleccionar soporte de pago.
3. En Facturación > Presupuestos y alertas, crear presupuesto mensual de USD 5, limitado a este proyecto. Configurar avisos de gasto real al 20%, 60% y 100% (USD 1, 3 y 5). Verificar correo destinatario. Si se quiere ver consumo bruto, revisar el tratamiento de créditos en el presupuesto.
4. Un presupuesto avisa, **no corta el gasto**. No crear SQL, GKE, VM, balanceador, IP reservada, NAT ni conectores VPC para seguir esta guía.
5. Elegir us-central1 para esta demo y mantener la misma región donde se permita. Secret Manager usará replicación automática. No cambiar de región una base existente sin revisar sus datos.

Hasta aquí no compartir contraseñas ni claves con el chat. Para adaptar los comandos solo hace falta el ID del proyecto.

## 3. Preparar Windows

Instalar Google Cloud CLI desde https://docs.cloud.google.com/sdk/docs/install y Node.js 22 o superior. Abrir PowerShell en la carpeta glacierquest del ZIP nuevo, la que contiene api, client y assets.

Ejecutar cada comando/bloque por separado. Si aparece un error, detenerse y resolverlo antes de continuar; los comandos nativos no siempre detienen PowerShell automáticamente.

```powershell
gcloud version
node --version
npm.cmd ci --ignore-scripts --prefix api
gcloud auth login
```

Definir valores reales (los textos siguientes son marcadores, no IDs utilizables):

```powershell
$ProjectId = 'TU_ID_REAL_DE_PROYECTO'
$MemberEmail = 'TU_CORREO_GOOGLE'
$Region = 'us-central1'
$BucketName = "$ProjectId-glacierquest-assets"
$RuntimeAccount = "glacierquest-runtime@$ProjectId.iam.gserviceaccount.com"
gcloud config set project $ProjectId
gcloud projects describe $ProjectId
gcloud billing projects describe $ProjectId
```

Verificar que billingEnabled sea true y que la identidad autenticada corresponde al equipo. La persona que prepara el proyecto necesita permisos administrativos para habilitar APIs, crear recursos y asignar roles. El servidor NO recibirá Owner ni Editor.

## 4. IAM: identidad del servidor

```powershell
gcloud services enable storage.googleapis.com secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com --project=$ProjectId
gcloud iam service-accounts create glacierquest-runtime --display-name='Glacier Quest runtime' --project=$ProjectId
gcloud iam service-accounts add-iam-policy-binding $RuntimeAccount --member="user:$MemberEmail" --role=roles/iam.serviceAccountTokenCreator --project=$ProjectId
```

El último permiso se da a TU usuario sobre ESA cuenta para probar localmente como runtime. No se otorga Token Creator a todo el proyecto. No crear ni descargar claves JSON. Si la cuenta ya existe, inspeccionarla y reutilizarla; no es necesario crear otra.

## 5. Cloud Storage: recurso visual real

```powershell
gcloud storage buckets create "gs://$BucketName" --project=$ProjectId --location=$Region --default-storage-class=STANDARD --uniform-bucket-level-access --public-access-prevention --soft-delete-duration=0
gcloud storage cp ./assets/glacier-banner.svg "gs://$BucketName/glacier-banner.svg"
gcloud storage buckets add-iam-policy-binding "gs://$BucketName" --member="serviceAccount:$RuntimeAccount" --role=roles/storage.objectViewer
```

El bucket es privado. Runtime puede leer objetos de este bucket; no recibe permisos de escribir ni borrar. La API existente descarga glacier-banner.svg y lo entrega al navegador con caché de cinco minutos. Desactivar soft delete aquí evita retener versiones borradas en esta demo desechable: no es una política de respaldo para información importante.

Si el nombre del bucket ya está ocupado por otra persona, usar otro proyecto/ID o ajustar conjuntamente el nombre y ASSET_BUCKET del iniciador. No usar un bucket ajeno.

## 6. Secret Manager: dos secretos

En la consola del proyecto abrir Secret Manager > Crear secreto, dos veces:

| Nombre exacto | Valor | Configuración |
|---|---|---|
| glacierquest-session | Cadena aleatoria de al menos 32 caracteres; ideal 64, generada por un gestor de contraseñas | Replicación automática; versión inicial 1 |
| glacierquest-demo-code | Código privado elegido por el equipo para entrar a la demo | Replicación automática; versión inicial 1 |

Guardar el código de clase en su gestor de contraseñas. No guardarlo en Git, capturas ni documentos de entrega. No compartir la clave de sesión con jugadores. No hace falta programar rotación automática ni pagar funciones adicionales.

Dar acceso exclusivamente a esos secretos:

```powershell
gcloud secrets add-iam-policy-binding glacierquest-session --member="serviceAccount:$RuntimeAccount" --role=roles/secretmanager.secretAccessor --project=$ProjectId
gcloud secrets add-iam-policy-binding glacierquest-demo-code --member="serviceAccount:$RuntimeAccount" --role=roles/secretmanager.secretAccessor --project=$ProjectId
```

El iniciador leerá versiones explícitas. Si los secretos ya existían y la versión vigente no es 1, indicarla con los parámetros SessionVersion y DemoVersion.

## 7. Conectar el juego local a esos tres servicios

Configurar Application Default Credentials por suplantación de la cuenta runtime:

```powershell
gcloud auth application-default login --impersonate-service-account=$RuntimeAccount
```

Esto configura credenciales locales que las bibliotecas Node.js encontrarán automáticamente. Afecta a otras aplicaciones locales que usan ADC, aunque estén en otra carpeta. gcloud auth login y ADC son configuraciones distintas. En esta terminal no debe existir GOOGLE_APPLICATION_CREDENTIALS apuntando a otra identidad.

Iniciar con el nuevo archivo (no usar start-local.cmd: ese archivo vacía la configuración cloud):

```powershell
.\start-cloud-local.ps1 -ProjectId $ProjectId
```

Si Windows bloquea scripts descargados, revisar primero el archivo y, solo para esta terminal, ejecutar `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`; si conserva la marca de descarga, usar `Unblock-File -LiteralPath .\start-cloud-local.ps1`. No cambiar la política global del equipo.

El iniciador obtiene secretos usando gcloud y la identidad runtime, sin imprimir sus valores; configura el bucket, inicia Node y restaura las variables de entorno al salir. No crea recursos, no habilita APIs, no cambia IAM ni despliega. El SDK de Storage usa el ADC que configuraste arriba. No se ejecutó contra GCP en esta entrega porque aún no hay proyecto.

Abrir http://localhost:8080. Introducir el código creado. La base sigue en memoria y perderá progreso al cerrar, pero el banner y los secretos se obtienen de GCP.

## 8. Evidencias que demuestran uso real

1. **Storage:** entrar, usar la comprobación de servicios y ver Google Cloud Storage como origen. En DevTools > Network, la respuesta de /api/asset debe tener X-Asset-Source: Google Cloud Storage. El bucket permanece privado.
2. **Secret Manager:** código incorrecto rechaza la entrada y el código guardado la permite. Mostrar nombres/versiones y permisos, no valores. El iniciador falla si no puede obtenerlos; el texto del panel es solo una ayuda, no una auditoría independiente.
3. **IAM:** mostrar que runtime solo tiene lectura sobre el bucket y acceso a dos secretos. Probar la siguiente escritura del MISMO banner usando runtime; debe fallar con permiso denegado. Si inesperadamente funciona, detenerse y quitar permisos heredados excesivos. No basta un error de autenticación o de red: debe ser una denegación de Storage.

```powershell
gcloud storage cp ./assets/glacier-banner.svg "gs://$BucketName/glacier-banner.svg" --impersonate-service-account=$RuntimeAccount
```

Capturar fecha, proyecto y resultado sin credenciales. /health debe indicar database=memory y cloud=false: eso es correcto en esta etapa. No presentarlo como despliegue Cloud Run.

## 9. Segunda sesión: persistencia y URL pública

No realizar hasta terminar la primera y revisar la facturación. Necesita además Docker Desktop con contenedores Linux para construir localmente; evita añadir Cloud Build por ahora.

En consola GCP, Firestore > Crear base: ID (default), edición Standard, modo Native, región us-central1. Si existe, revisar la existente, no duplicarla. No habilitar TTL, backups ni PITR en esta prueba desechable; no hay respaldo de progreso importante.

```powershell
gcloud services enable firestore.googleapis.com run.googleapis.com artifactregistry.googleapis.com --project=$ProjectId
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$RuntimeAccount" --role=roles/datastore.user
.\start-cloud-local.ps1 -ProjectId $ProjectId -Store firestore
```

Firestore se administra desde GCP y se usa vía SDK servidor. El rol de datos tiene alcance de proyecto: usar uno dedicado. Probar recolección, reinicio y turnos concurrentes. /health debe mostrar firestore. No contar Firestore entre los siete.

Después de detener el servidor local y comprobar Docker:

```powershell
docker version
gcloud artifacts repositories create glacierquest --repository-format=docker --location=$Region --project=$ProjectId
gcloud auth configure-docker "$Region-docker.pkg.dev"
$ImageUri = "$Region-docker.pkg.dev/$ProjectId/glacierquest/game:primera-demo"
docker build --platform linux/amd64 -t $ImageUri .
docker push $ImageUri
gcloud run deploy glacierquest --image=$ImageUri --region=$Region --project=$ProjectId --service-account=$RuntimeAccount --allow-unauthenticated --min=0 --max=1 --cpu=1 --memory=512Mi --concurrency=40 --timeout=30s --cpu-throttling --no-cpu-boost --set-env-vars="NODE_ENV=production,STORE=firestore,GOOGLE_CLOUD_PROJECT=$ProjectId,ASSET_BUCKET=$BucketName" --set-secrets='SESSION_SECRET=glacierquest-session:1,DEMO_CODE=glacierquest-demo-code:1'
```

Ajustar las versiones si no son 1. El endpoint web es público para que los compañeros abran la interfaz; las acciones del juego exigen código y sesión. Si una política de la organización prohíbe acceso público, no intentar eludirla: pedir el acceso permitido o usar otro proyecto autorizado.

```powershell
$GameUrl = gcloud run services describe glacierquest --region=$Region --project=$ProjectId --format='value(status.url)'
Invoke-RestMethod "$GameUrl/health"
```

Ver status=ok, database=firestore y cloud=true. Abrir la URL en dos pestañas para comprobar juego, bucket y persistencia; ver una petición real en Cloud Run > Logs. Conservar solamente la imagen necesaria para este primer ensayo; añadir política de limpieza antes de acumular despliegues. Cerrar pestañas después del ensayo: el sondeo del juego genera tráfico mientras siguen abiertas. No se necesita dominio, IP estática ni balanceador propio.

## 10. Cómo conectar el resto, sin hacerlo hoy

| Servicio | Implementación necesaria | Prueba de aceptación |
|---|---|---|
| Observabilidad | Ya hay logs JSON. Al desplegar, añadir el dashboard Terraform de latencia/tráfico y revisar errores reales | Encontrar requestId y mostrar métricas; no contar Logging y Monitoring por separado |
| GitHub Actions | Crear repo del equipo, WIF limitado a repo/main, cuenta deploy, environment class-demo y variables del workflow existente | Un commit probado, imagen subida y nueva revisión que pasa /health |
| Cloud Tasks | Cola regional; API crea trabajo con ID estable; worker privado en Cloud Run valida OIDC y actualiza Firestore con idempotencia | Simular fallo, reintentar y comprobar que un trabajo produce un solo resultado |
| Cloud Scheduler | Un job diario invoca por OIDC un worker privado de limpieza; paginar y limitar borrados de chat/presencia vencidos | Ejecución manual del job borra solo datos vencidos; un segundo intento no afecta datos vigentes |

Tasks sustituye Pub/Sub, pero su función original propuesta era una expedición diferida. Como ahora no se quiere cambiar el juego, no implementaremos esa mecánica. La alternativa sin cambiar jugabilidad es generar un resumen de combate en segundo plano y guardarlo como objeto en Storage; tendrá que ser consultable y tener utilidad real, no un archivo que nadie utiliza. Antes de conectar Tasks se elegirá ese resultado concreto y se hará la mínima interfaz necesaria, o se pospondrá el servicio. Siete candidatos siguen disponibles sin Tasks; no forzar ocho integraciones por número.

Scheduler sí tiene una necesidad actual: limitar acumulación de chat y presencia. Definir retención (por ejemplo chat 7 días y presencia desconectada 1 día), filtro por fecha, lotes limitados y recorrido por cursor. Debe ejecutarse con permisos propios; el endpoint interno no se publica en el servicio web sin verificar identidad. Reintentos de Tasks/Scheduler requieren idempotencia. El cómputo del worker y las operaciones de Firestore se cobran aparte de las cuotas de estos servicios.

## 11. Costos y operación

Primera sesión: un SVG pequeño, dos versiones de secreto y unos pocos accesos. El uso puede entrar en las cuotas gratuitas disponibles; no se garantiza factura cero. No hay servidor cloud encendido ni SQL. IAM no cobra por estos roles/cuentas estándar. Secret Manager incluye 6 versiones activas y 10.000 accesos mensuales; controlar versiones al rotar. Storage cobra según bytes, ubicación, operaciones y transferencia.

Segunda sesión: Cloud Run por solicitud, mínimo cero y máximo una instancia para el primer ensayo. El máximo no es tope monetario ni garantía de una sola instancia durante toda transición de despliegue. Firestore cobra operaciones, por eso se conserva la caché. Artifact Registry cobra almacenamiento por encima de su cuota. Revisar Billing > Reports por servicio después del ensayo; la información puede llegar con retraso.

No habilitar sondas permanentes, IA, métricas personalizadas, balanceadores ni SQL. No aplicar el Terraform general después de estos comandos sin importar/conciliar los recursos creados a mano. Esta ruta manual facilita el primer contacto y las evidencias; el trabajo de importar a Terraform queda pendiente para el bonus. Reutiliza los mismos nombres para facilitarlo, pero no elimina el requisito de importar.

Al finalizar la primera prueba, Ctrl+C detiene el servidor. Si no se usarán más las credenciales ADC locales, `gcloud auth application-default revoke` las revoca; afecta a otras aplicaciones que usen ese ADC. Los recursos guardados en nube continúan existiendo. No se incluye un comando de borrado global de proyecto ni de datos.

## Fuentes oficiales

- Instalación CLI: https://docs.cloud.google.com/sdk/docs/install
- ADC e impersonación para Node.js: https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment
- Creación del bucket: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Secretos en Cloud Run: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Despliegue: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Presupuestos: https://docs.cloud.google.com/billing/docs/how-to/budgets
- Chat en tiempo real: https://firebase.google.com/docs/firestore/query-data/listen
- Costos Run: https://cloud.google.com/run/pricing
- Costos Storage: https://cloud.google.com/storage/pricing
- Costos secretos: https://cloud.google.com/secret-manager/pricing
- Costos Tasks: https://cloud.google.com/tasks/pricing
- Costos Scheduler: https://cloud.google.com/scheduler/pricing
