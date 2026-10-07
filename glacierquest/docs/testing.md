# Pruebas

Desde glacierquest: `npm ci --ignore-scripts --prefix api` y `npm test --prefix api`. Las pruebas HTTP abren un puerto temporal y no requieren nube.

Para PostgreSQL real, seguir README con Docker Compose y ejecutar `npm run test:postgres --prefix api` con TEST_DATABASE_URL apuntando a una base local desechable con el esquema aplicado. La prueba verifica persistencia entre conexiones, bloqueo de turno concurrente y presencia. Se omite si la variable falta; no considerar una prueba omitida como aprobada.

Prueba manual: entrar, mover por clic, recoger moneda, atacar al guardián, defender ante ventisca, curar y huir. Recargar conserva la sesión de esa pestaña; reiniciar el servidor en memoria elimina los datos. Con PostgreSQL, comprobar también el reinicio del servidor manteniendo la misma SESSION_SECRET.

La carga futura se prueba con `node api/test/load.js`: 30 jugadores, 12 ciclos a intervalos de cinco segundos. No ejecutar contra nube sin conocer el costo y sin TEST_URL y DEMO_CODE correctos. La presentación multijugador pública no forma parte de la aceptación de esta preentrega.
