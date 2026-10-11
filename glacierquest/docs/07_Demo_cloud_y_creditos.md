# Demo en Google Cloud y protección del crédito

> Esta página documenta la etapa inicial con memoria temporal. La demo actual ya
> utiliza Firebase Realtime Database; consultar [Firebase y Scheduler](08_Firebase_y_Scheduler.md).

Revisión: 2026-10-10. Proyecto autorizado: `glacier-quest-1791678996`.
Cuenta: `angelcamargopro2005@gmail.com`. Facturación vinculada verificada:
`019891-D38015-39EEC1`.

## Estado real

**Tres servicios desplegados y probados:** Cloud Run, Cloud Storage y Secret Manager.
Antes de crear recursos, la consola de la cuenta autorizada mostró prueba gratuita
activa, US$300 disponibles y vencimiento el **9 de enero de 2027**. Es el saldo
anterior al despliegue; los informes pueden tardar en reflejar el consumo posterior.
No se ha actualizado la facturación a una cuenta de pago. IAM y la federación
de GitHub corresponden a la etapa anterior documentada en el archivo 06.

## Qué cubre la prueba

La documentación de Google permite usar Cloud Run, Cloud Storage y Secret Manager
con el crédito de bienvenida. Desplegar la aplicación no activa por sí mismo una
cuenta de pago. Tampoco lo hace la variable de Node.js `NODE_ENV=production`:
es una configuración del software, independiente de Cloud Billing.

Durante la prueba gratuita Google indica que no factura el consumo a la tarjeta.
Si se agota el crédito o vence el plazo sin actualizar a una cuenta de pago, los
recursos se detienen. Una actualización manual permite cargos por consumo no
cubierto; el crédito restante conserva su vencimiento original. Por eso esta demo
debe mantener la cuenta en prueba gratuita y no pulsar **Activar / Actualizar**.

Fuentes oficiales consultadas:

- [Programa gratuito: cobertura, cobros y cómo verificar el tipo de cuenta](https://docs.cloud.google.com/free/docs/free-cloud-features).
- [Condiciones de la prueba gratuita](https://cloud.google.com/terms/free-trial).

La prueba no ofrece SLA. Este despliegue será una demostración académica. No es
necesario agotar los US$300: primero se aprovechan las franquicias gratuitas;
el consumo elegible que las exceda utiliza el crédito disponible.

## Tres servicios de la demo

| Servicio | Uso real comprobado | Configuración aplicada |
| --- | --- | --- |
| Cloud Run | Ejecutar API y cliente del juego | Servicio público con código de clase `glacierquest-demo`, región `us-central1`, CPU por solicitudes, 512 MiB, mínimo 0, máximo 1 instancia |
| Cloud Storage | Servir `glacier-banner.svg` mediante la API del juego | Bucket regional privado, acceso uniforme y prevención de acceso público; lectura para la identidad de ejecución |
| Secret Manager | Proporcionar `SESSION_SECRET` y `DEMO_CODE` a Cloud Run | Dos secretos, versiones explícitas y acceso limitado a la identidad de ejecución |

IAM protege los recursos. Artifact Registry almacena la imagen y Cloud Build
la construyó con una identidad separada sin acceso a los secretos. La cuenta
`glacierquest-runtime` tiene lectura del bucket de recursos y de los dos secretos;
`glacierquest-build` tiene escritura en el repositorio de imágenes, lectura del
bucket de fuentes y escritura de logs. No se crearon claves JSON.
Estos servicios auxiliares también deben vigilarse en Facturación.

Bucket de recursos: `glacier-quest-1791678996-demo-assets`, con prevención de acceso
público y acceso uniforme. Bucket auxiliar: `glacier-quest-1791678996-demo-build`,
con eliminación de fuentes `source/` al cumplir un día. Soft delete desactivado en
ambos buckets de demo. Repositorio Docker: `glacierquest-demo` en `us-central1`.
Secretos: `glacierquest-demo-session` y `glacierquest-demo-code`, versiones 1.

Acceso público autorizado por el usuario: `allUsers` tiene `roles/run.invoker` únicamente sobre esta demo. El juego exige código de clase para crear una sesión; Storage y secretos permanecen privados. Máximo configurado 1 tanto por servicio
como por revisión; CPU por solicitudes, sin startup CPU boost, concurrencia 40 y
timeout 30 segundos. Cloud Build tiene timeout de 10 minutos y no tiene trigger.

Alerta creada: **US$10 al mes antes de créditos**, solo para este proyecto,
umbrales 50 %, 90 % y 100 %, destinatarios IAM predeterminados de facturación.
ID: `f2292b5b-92b1-4d73-8b11-88b036b2d88e`. Esta alerta no detiene el consumo.

No se requiere Cloud SQL, Firestore, GKE, balanceador externo ni una VM para esta
etapa. La base de datos académica sigue pendiente: la memoria del proceso no cuenta
como servicio de base de datos y puede perderse en cualquier reinicio o cambio de
instancia. El máximo de instancias reduce el escalado, pero no es un límite monetario
ni una garantía de persistencia. Las alertas presupuestarias tampoco detienen el
consumo por sí mismas.

## Preparación disponible

- `api/src/config.js` exige claves y bucket incluso en modo demo alojado.
- `GQ_DEMO_MODE=true` permite explícitamente `STORE=memory` para esta etapa.
- `/health` informa si los datos son temporales; el cliente muestra el aviso.
- `.gcloudignore` limita la subida a fuentes de aplicación y dependencias fijadas.
- `cloudbuild.demo.yaml` construye la imagen, sin disparador automático ni despliegue.
- Las 12 pruebas locales pasan. `infra/demo/verify.py` pasó contra Google Cloud:
  acceso público, endpoints del juego protegidos por sesión, salud en nube, referencias de secretos versión 1, código incorrecto
  rechazado, dos jugadores, recurso de Storage, chat y presencia.

## Abrir y compartir la demo

Abre [Glacier Quest](https://glacierquest-demo-636305098699.us-central1.run.app)
y escribe tu nombre y el código de clase. Comparte el enlace y el código solo con
los compañeros que deban jugar. No hace falta cuenta de Google, PowerShell ni
localhost para entrar. La computadora del propietario puede estar apagada.

El código está en Secret Manager (`glacierquest-demo-code`, versión 1); no debe
incluirse en el repositorio. El acceso público no cambia la modalidad de facturación.
El máximo de una instancia y las alertas de US$10 permanecen configurados.
Las solicitudes ajenas también pueden consumir recursos, aunque no conozcan el
código. El código no equivale a protección contra ataques o a un tope de gasto.

`start-cloud-demo.ps1` se conserva como herramienta opcional de acceso autenticado;
no es necesario para utilizar el enlace público. La verificación de la demo ahora
prueba la portada sin credenciales de Google y rechaza sesiones sin código válido.

## Evidencia

- Revisión lista: `glacierquest-demo-00001-xdj`.
- URL: `https://glacierquest-demo-636305098699.us-central1.run.app`.
- Digest: `sha256:0219b0059ef667c7ef45006dcd687fba50c10487fe4e440871b0ce91d93fb5d6`.
- Imagen: `us-central1-docker.pkg.dev/glacier-quest-1791678996/glacierquest-demo/game`.
- [Build exitoso](https://console.cloud.google.com/cloud-build/builds;region=us-central1/11065744-f865-460a-bd2a-7f6487d57616?project=glacier-quest-1791678996).
- [Cloud Run](https://console.cloud.google.com/run/detail/us-central1/glacierquest-demo?project=glacier-quest-1791678996).

`infra/demo/deploy.ps1` separa `Provision`, `Build` y `Deploy`. Requiere verificar
visualmente la prueba gratuita antes de usar `-TrialVerified`. Build exige un tag
nuevo y Deploy un digest inmutable. Si se rotan secretos, actualizar las referencias
explícitas a versión 1. GitHub Actions sigue validando código e identidad; este
despliegue se hizo con Cloud Build y gcloud.

No aplicar el módulo Terraform general sin revisar su estado e importar los
recursos existentes: incluye alternativas de infraestructura que no corresponden
a esta etapa.
