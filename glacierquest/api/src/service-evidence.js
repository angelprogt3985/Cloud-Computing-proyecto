// This is evidence from the current API, not an audit of the cloud control plane.
function serviceEvidence({ kind, databaseOk, asset, cleanup, env = process.env }) {
  const cloud = Boolean(env.K_SERVICE);
  const localDb = kind === 'memory' || (kind === 'firestore' && Boolean(env.FIRESTORE_EMULATOR_HOST));
  const databaseName = { memory: 'Datos de práctica', realtime: 'Firebase Realtime Database', firestore: 'Firestore', postgres: 'PostgreSQL' }[kind] || 'Base de datos';
  const row = (name, purpose, state, status) => ({ name, purpose, state, status });
  return [
    row('Cloud Run', 'Mantiene la plaza y procesa las acciones del juego.', cloud ? 'configured' : 'local', cloud ? 'El proceso informa que está en Cloud Run; revisión y límites se verifican en consola.' : 'Esta partida usa el servidor local.'),
    row(databaseName, 'Conserva jugadores y comparte presencia y conversación.', !databaseOk ? 'error' : localDb ? 'local' : 'verified', !databaseOk ? 'La comprobación de datos falló.' : kind === 'memory' ? 'Memoria local: los datos desaparecen al cerrar el servidor.' : localDb ? 'Emulador local; no verifica la nube.' : `${databaseName} respondió a la comprobación. ${['realtime', 'firestore'].includes(kind) ? 'Fuera del conteo académico.' : 'El proveedor Cloud SQL debe verificarse en consola.'}`),
    row('Cloud Storage', 'Entrega el paisaje del diario de expedición.', !asset ? 'error' : asset.source === 'archivo local' ? 'local' : 'verified', !asset ? 'No se pudo obtener el recurso visual.' : `${asset.source}. Recurso cargado: ${new Date(asset.at).toISOString()}; caché de hasta cinco minutos.`),
    row('IAM', 'Define qué puede hacer cada identidad del proyecto.', 'pending', 'Roles y federación requieren evidencia en consola o en la ejecución de identidad de Actions.'),
    row('Secret Manager', 'Protege las claves de sesión y el código de clase.', cloud || env.GQ_SECRET_SOURCE === 'gcloud-secret-manager' ? 'pending' : 'local', cloud ? 'Verificar referencias de secretos en la revisión; esta API no inspecciona su origen.' : 'El modo local no demuestra Secret Manager.'),
    row('Logging + Monitoring', 'Ayuda a investigar errores y tiempos de respuesta.', 'pending', 'La API genera logs estructurados; recepción, métricas y panel requieren evidencia en consola.'),
    row('Cloud Build', 'Construye la imagen que se despliega.', 'pending', 'Verificar una construcción exitosa y su vínculo con el commit.'),
    row('GitHub Actions', 'Comprueba el código antes de una entrega.', 'pending', 'Verificar el resultado del workflow para el commit; no despliega automáticamente.'),
    row('Artifact Registry', 'Conserva las imágenes para desplegar o volver a una versión anterior.', 'pending', 'Verificar el digest de la imagen utilizada por Cloud Run.'),
    row('Cloud Scheduler', 'Limpia presencia y chat antiguos, conservando el progreso.', cleanup && env.CLEANUP_SERVICE_ACCOUNT && env.CLEANUP_AUDIENCE ? 'configured' : 'pending', cleanup && env.CLEANUP_SERVICE_ACCOUNT && env.CLEANUP_AUDIENCE ? 'Endpoint protegido configurado. La ejecución y el estado pausado/activo del job se verifican en consola.' : 'No configurado en este entorno; esto no indica si el job de la nube está activo.')
  ];
}
module.exports = { serviceEvidence };
