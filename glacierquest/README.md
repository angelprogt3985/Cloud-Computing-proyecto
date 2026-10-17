> Actualización local del 17 de octubre: [chat temporal, ficha y armario](docs/13_Cambios_y_siguiente_paso.md). No desplegada. [Auditoría y límites de verificación](docs/12_Servicios_y_alcance_2026-10-17.md).

> Evidencia histórica: [Verificación funcional de los siete servicios y panel de Monitoring](docs/11_Verificacion_de_los_7_servicios.md).

> Interfaz actual: [Pantalla completa, portada Jugar y menús flotantes](docs/10_Pantalla_completa.md).

> Actualización del juego: [Expedición Boreal, cuentas y progreso](docs/09_Expedicion_y_cuentas.md). Crea tu cuenta con correo y código de clase para recuperar tu personaje.

> Infraestructura: [Firebase y Scheduler](docs/08_Firebase_y_Scheduler.md). Cloud Run con enlace público y código de clase + Cloud Storage + Secret Manager + Firebase Realtime Database desplegados en `glacier-quest-1791678996`. [Abrir el juego](https://glacierquest-demo-636305098699.us-central1.run.app). Usa el código de clase; no necesitas localhost. El progreso se guarda en Firebase. [Etapa anterior: demo y créditos](docs/07_Demo_cloud_y_creditos.md).

# Glacier Quest — Expedición Boreal

**Inicio vigente:** [Nueva base y servicio sustituto: Firebase + Scheduler](docs/08_Firebase_y_Scheduler.md). Los documentos 01–07 conservan las etapas anteriores.

Proyecto de Cloud Computing. La base integrada ahora es Firebase Realtime Database, autorizada por el docente fuera del conteo de siete servicios. Cloud Scheduler sustituye el lugar de Cloud SQL en ese conteo. La demo publicada guarda el progreso en Firebase; la integración y sus verificaciones se detallan en el documento 08.

## Abrir la demo local

Requiere Node.js 22 o superior. En Windows ejecutar `start-local.cmd` y abrir http://localhost:8080. Código de clase vacío. La instalación inicial requiere internet. El modo memoria pierde sus datos al cerrar el servidor y se identifica como local en pantalla.

Alternativa desde esta carpeta:

```powershell
npm ci --ignore-scripts --prefix api
npm start --prefix api
```

Si 8080 está ocupado, cerrar el servidor anterior o usar `$env:PORT='8081'` y abrir ese puerto. No abrir index.html directamente.

## Qué funciona

Cuentas con correo, progreso persistente, niveles y experiencia, cinco zonas explorables, misiones, pesca, movimiento con teclado/clic, carrera, minimapa y chat. Combate contra el guardián y duelos consentidos entre jugadores, con ataque, defensa, curación y retirada. La información técnica se consulta desde el engranaje, sin ocupar el panel de juego. Ver controles y límites en el documento 09.

## Probar PostgreSQL local cuando corresponda

Con Docker Desktop disponible:

```powershell
docker compose up -d
$env:STORE='postgres'
$env:DB_HOST='127.0.0.1'
$env:DB_USER='glacierquest'
$env:DB_PASSWORD='local-demo-only'
$env:DB_NAME='glacierquest'
$env:SESSION_SECRET='local-only-key-change-before-cloud-123456'
npm start --prefix api
```

El esquema se carga al crear el volumen por primera vez. `docker compose down` detiene sin borrar datos. No usar `down -v` si desean conservarlos. Estas credenciales son exclusivamente locales, nunca para nube.

## Pruebas

`npm test --prefix api` ejecuta lógica y HTTP en memoria. Para integración SQL con la base local anterior:

```powershell
$env:TEST_DATABASE_URL='postgres://glacierquest:local-demo-only@127.0.0.1:5432/glacierquest'
npm run test:postgres --prefix api
```

La prueba SQL se omite sin esa variable; requiere una base desechable de pruebas con esquema aplicado. No se ejecutó contra un PostgreSQL real en esta entrega.

## Documentación

- `docs/01_Cambios_realizados.pdf`: qué se cambió, comprobaciones y límites.
- `docs/02_Plan_de_servicios.pdf`: siete servicios previstos, relación con los labs, etapas, arquitectura, despliegue y costos; Pub/Sub pendiente y componentes de apoyo fuera del conteo.
- Versiones editables de ambos documentos en `.md`.
- `docs/deployment-steps.md`: comandos de configuración para la etapa de nube.

El ZIP conserva la estructura del repositorio: `.github/workflows` está en la raíz, junto a `glacierquest`. Descomprimir el ZIP completo; no copiar únicamente la carpeta interior si quieren usar Actions. El Dockerfile válido es `glacierquest/Dockerfile`.

La demo ya integra Cloud Run, Cloud Storage y Secret Manager, con IAM y Cloud Build para ejecutarla y desplegarla. No se ha creado Cloud SQL. Consultar los documentos 07 y 08 para separar recursos desplegados de trabajo pendiente.

## Alineación con laboratorios

Los PDFs conservan el plan anterior basado en los laboratorios. El plan actualizado de siete servicios está en el documento 08: Run, Storage, IAM, Secret Manager, Cloud Build, Logging + Monitoring y Scheduler. Firebase queda fuera del conteo; Artifact Registry apoya el despliegue. La aceptación académica depende de demostrar cada integración.
