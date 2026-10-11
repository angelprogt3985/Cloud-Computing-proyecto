> Estado vigente: [Demo real y crédito de prueba](docs/07_Demo_cloud_y_creditos.md). Cloud Run con enlace público y código de clase + Cloud Storage + Secret Manager desplegados en `glacier-quest-1791678996`. [Abrir el juego](https://glacierquest-demo-636305098699.us-central1.run.app). Usa el código de clase; no necesitas localhost. Progreso temporal; base de datos pendiente. [Etapa anterior: IAM y Actions](docs/06_Conexion_IAM_Actual.md).

# Glacier Quest 0.3 - Preentrega

**Inicio vigente:** [Demo cloud y credito de prueba](docs/07_Demo_cloud_y_creditos.md). Los documentos 04/05 conservan planes anteriores. La base de datos y los demas servicios siguen pendientes.

Proyecto de Cloud Computing. Esta entrega prioriza los servicios y sus etapas de integración. No utiliza Firestore. La base prevista es PostgreSQL en Cloud SQL.

## Abrir la demo local

Requiere Node.js 22 o superior. En Windows ejecutar `start-local.cmd` y abrir http://localhost:8080. Código de clase vacío. La instalación inicial requiere internet. El modo memoria pierde sus datos al cerrar el servidor y se identifica como local en pantalla.

Alternativa desde esta carpeta:

```powershell
npm ci --ignore-scripts --prefix api
npm start --prefix api
```

Si 8080 está ocupado, cerrar el servidor anterior o usar `$env:PORT='8081'` y abrir ese puerto. No abrir index.html directamente.

## Qué funciona

Movimiento por clic/toque, chat, objetos recogibles, sesiones individuales y combate con ataque, defensa, curación, retirada y respuesta del enemigo. Panel que distingue servicios locales de comprobaciones de nube pendientes.

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

No se desplegó en GCP ni se contrataron servicios. La configuración no crea Cloud SQL ni Cloud Run por defecto. El requisito formal M2 de dos servicios desplegados sigue pendiente hasta que el equipo lo complete con su cuenta.

## Alineación con laboratorios

El plan de servicios fue ajustado a los labs compartidos por el equipo. Pub/Sub (lab 18) se incorpora al plan principal como etapa futura, todavía sin implementación. Secret Manager y Artifact Registry se conservan como apoyo, fuera del conteo de siete. El PDF de servicios distingue menciones explícitas de inferencias: los títulos Serverless/DevOps no confirman por sí solos Cloud Run/GitHub Actions. No se cambió el comportamiento del juego en esta revisión documental.
