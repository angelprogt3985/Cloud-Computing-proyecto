# Seguridad y límites conocidos

La API toma el jugador de una sesión HMAC, nunca de un playerId enviado por el cliente. Nombres iguales no dan acceso al mismo inventario. Las sesiones caducan en siete días; no hay recuperación de cuentas. En local la clave cambia al reiniciar. En nube la clave y el código de clase vienen de Secret Manager, con versiones explícitas. Código compartido es una barrera para la demo, no autenticación institucional.

Inventario y turnos viven en transacciones Firestore por jugador. Cada turno exige ID de batalla y número actual: una repetición o clic concurrente no duplica recompensa. Cada objeto tiene ID fijo y se recoge una vez por jugador. Los mensajes se insertan como texto en el DOM. La API limita tamaños, valida tipos y coordenadas y no devuelve trazas internas.

El bucket es privado, con prevención de acceso público. Cloud Run lee el objeto usando roles/storage.objectViewer. La cuenta runtime tiene roles/datastore.user y acceso solo a los dos secretos; no administra infraestructura. El alcance de datastore.user es el proyecto: por eso se recomienda proyecto dedicado. Las reglas Firebase no protegen el SDK servidor; la protección relevante aquí es IAM y la validación de API.

La cuenta de deploy puede escribir en ese registro y bucket, actuar como runtime y actualizar ese servicio. La federación solo admite el ID numérico del repositorio, propietario y refs/heads/main. Proteger main y las modificaciones de workflows; quien despliega código puede hacer que runtime use sus permisos. No asignar claves JSON persistentes ni exponer secretos en variables de GitHub.

Limitaciones: coordenadas controladas por cliente, límite de solicitudes por instancia, máximo de cuarenta presencias, chat concentrado en un documento y registros antiguos sin limpieza automática. No anunciar resistencia a abuso público ni a tráfico masivo. El código de clase y escala máxima ayudan a acotar uso académico; un presupuesto solo notifica. Antes de una publicación abierta harían falta autenticación recuperable, protección distribuida, cuotas por usuario y reglas de movimiento más estrictas.

Los logs incluyen ruta sin query, estado, duración y requestId; no incluyen tokens, nombres ni mensajes. La UI comprueba base y objeto, pero indica revisión manual para IAM, Secret Manager, CI y Observability. Mostrar un estado de consola verificado es responsabilidad de la demostración.
