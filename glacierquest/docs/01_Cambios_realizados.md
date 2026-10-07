# Glacier Quest cambios realizados

Preentrega de Cloud Computing 2026 · Universidad Galileo · 7 de octubre de 2026

## Propósito y estado

Esta iteración convierte la primera estructura del proyecto en una demo local presentable y deja preparado el camino para implementar los servicios de nube. El objetivo académico es mostrar qué hace cada servicio, cómo se conectará y cómo se comprobará, sin exigir que el juego final esté terminado.

La entrega no usa Firestore. La base prevista es PostgreSQL administrado en Cloud SQL, conforme a la aclaración del equipo. La demo rápida usa memoria local para no exigir servicios pagados; también se incluye un adaptador PostgreSQL, esquema SQL y configuración de Docker Compose para la siguiente etapa.

El proyecto de Google Cloud, la facturación y el repositorio remoto no estuvieron disponibles. Por tanto, no se desplegaron servicios ni se generaron cargos de nube. Los documentos distinguen código implementado, pruebas realizadas e integración pendiente.

## Cambios en el juego

| Área | Cambio realizado | Qué permite mostrar |
|---|---|---|
| Movimiento | Destino mediante clic o toque, desplazamiento continuo y marcador | Interacción sencilla sin depender de WASD |
| Accesibilidad básica | Flechas como alternativa cuando el mapa tiene foco | El chat no dispara movimiento accidental |
| Plaza | Sincronización cada cinco segundos e interpolación visual | Base funcional para varias personas más adelante |
| Combate | Salud del enemigo, turnos y contraataque real | Una acción produce una respuesta controlada por servidor |
| Estrategia | El enemigo anuncia golpe, carga o ventisca | Atacar durante carga y defender antes de ventisca |
| Inventario | Objetos con ID fijo y recolección única por jugador | Estado que podrá demostrarse en la base de datos |
| Sesiones | Identificador independiente y firma de sesión | Un nombre repetido no permite tomar otro inventario |
| Servicios | Vista de comprobaciones y evidencia pendiente | Explicar qué está local y qué aún requiere nube |

## Cómo funciona el combate

El guardián alterna golpe de hielo, carga y ventisca. El ataque del jugador causa ocho puntos, o doce cuando el enemigo está cargando. Defender reduce el daño recibido un 75 %, redondeando hacia arriba: una ventisca de catorce queda en cuatro. Hay dos pociones de doce puntos de salud y curarse consume turno. Huir finaliza sin premio.

Ganar entrega diez monedas una sola vez. Cada acción lleva un identificador de duelo y número de turno, de modo que repetir una solicitud no duplica el premio. En PostgreSQL se prepara una transacción con bloqueo de la fila del jugador para serializar acciones concurrentes. La derrota permite un nuevo duelo con salud restaurada después de un descanso de diez segundos.

## Cambios técnicos relevantes

La web y la API se sirven desde el mismo proceso Express. Esto simplifica el arranque local y la futura dirección HTTPS de Cloud Run. Las rutas cubren entrada, sincronización, chat, inventario, duelo, estado de servicios y recurso visual. La API valida tipos, tamaños y límites de coordenadas y devuelve errores sin exponer trazas internas.

El adaptador SQL usa un pool de hasta cinco conexiones por instancia. Inventario y duelo se guardan como estado JSONB dentro de una tabla PostgreSQL; presencia y chat usan tablas separadas. El esquema y los permisos del usuario de ejecución se encuentran en api/sql. Esta elección conserva la lógica sencilla y evita introducir una migración compleja de todo el modelo para la preentrega.

El recurso visual de la expedición puede cargarse desde un bucket privado mediante el SDK oficial de Cloud Storage. En local se usa un SVG incluido; la pantalla lo identifica como archivo local. En nube una falla del bucket no activa un reemplazo silencioso.

Se agregaron Dockerfile, Terraform y workflows de GitHub Actions. Los workflows están en la raíz del repositorio, que es donde GitHub los reconoce. No se incluyeron archivos .env, claves de servicio, dependencias instaladas ni estado de Terraform en el paquete.

## Comprobaciones y límites de evidencia

Las siete pruebas automatizadas de lógica y API en memoria pasaron después de retirar Firestore. Cubren el contraataque, defensa, curación, derrota, turnos repetidos, recolección, separación de sesiones, chat y respuesta de errores. Las pruebas anteriores de navegador comprobaron clic, entrada al duelo y contraataque; la sustitución de la base no cambia esa interfaz.

En la revisión previa se simularon treinta jugadores y 360 sincronizaciones locales: no hubo errores y el p95 fue de 117 ms. Es evidencia del modo memoria de esa revisión, no una promesa de rendimiento de PostgreSQL ni de la nube. No es necesario repetir una presentación multijugador pública para aceptar esta preentrega.

La integración con PostgreSQL real queda como prueba pendiente, con un comando reproducible incluido. Terraform aprobó formato y validate con la configuración Cloud SQL, usando Terraform 1.12.2 y proveedor Google 7.46.1. Falta revisar plan en la cuenta destino antes de aplicar. La instalación final de dependencias reportó cero vulnerabilidades conocidas. Un archivo de infraestructura o una validación local no prueba que los servicios estén desplegados.

## Cómo presentar este avance

1. Abrir start-local.cmd y entrar a la plaza sin código de clase.
2. Moverse con clic, recoger un objeto y entrar a un duelo.
3. Mostrar el anuncio de ventisca, defender y observar la respuesta.
4. Abrir el panel de servicios y explicar que el modo actual es local.
5. Presentar el diagrama y las etapas del segundo documento: dónde irán cómputo, base de datos, almacenamiento, seguridad, monitoreo y despliegue.

La sesión local desaparece al reiniciar el servidor. PostgreSQL local o Cloud SQL aportarán persistencia entre reinicios. La sesión del navegador dura siete días y se conserva al recargar la misma pestaña, pero no existe recuperación de cuentas. Las coordenadas son controladas por el cliente: no hay antitrampas competitivo.

## Archivos entregados

El ZIP incluye el código, scripts de arranque, pruebas, migraciones, Docker Compose, Terraform, workflows y los dos informes en PDF y Markdown. Los documentos originales del curso permanecen intactos. El paquete actualizado es la versión de referencia de esta entrega; no debe mezclarse con las configuraciones anteriores que proponían Firestore.
