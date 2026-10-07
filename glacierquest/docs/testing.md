# Pruebas reproducibles

Desde glacierquest: `npm ci --ignore-scripts --prefix api`, después `npm test --prefix api`. Pruebas HTTP usan un puerto temporal y no necesitan credenciales ni nube.

## Firestore con emulador

El emulador permite probar el SDK GCP sin cargos. No es Firebase como servicio desplegado. Instalar Google Cloud CLI y su componente oficial: `gcloud components install cloud-firestore-emulator`. Ejecutar en una terminal `gcloud emulators firestore start --host-port=127.0.0.1:8787`. En otra terminal PowerShell:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8787'
$env:GCLOUD_PROJECT='glacierquest-test'
npm run test:firestore --prefix api
```

La prueba comprueba persistencia entre dos clientes y exclusión de turnos concurrentes. Sin FIRESTORE_EMULATOR_HOST se omite explícitamente: una prueba omitida no prueba la integración. Nunca establecer ese valor en Cloud Run.

## Carga

Arrancar API local y ejecutar `node api/test/load.js`. Crea treinta jugadores y sincroniza doce veces cada cinco segundos; informa p95 y falla ante cualquier HTTP no exitoso. Para nube, establecer TEST_URL y DEMO_CODE en el entorno únicamente cuando el equipo autorice la prueba y conozca el costo; crea datos de prueba reales. Repetir después de cada cambio relevante de arquitectura o de región.

## Navegador

Ingresar en dos pestañas independientes, moverse por clic, esperar la sincronización y enviar chat. Recoger cada objeto, recargar y confirmar que no reaparece ni duplica monedas. Entrar al duelo, atacar durante la carga, defender frente a la ventisca, curar y huir. Hacer doble clic rápido en ataque: no deben resolverse dos copias del mismo turno. Cerrar el panel conserva el duelo; reabrir lo continúa. La derrota permite un nuevo duelo con salud restaurada tras diez segundos.

Comprobar desconexión del servidor, HTTP 503 si falla la base y error de Storage sin fallback en nube. Revisar presentación en móvil y escritorio. El número de jugadores es limitado; no es una prueba de MMO masivo.
