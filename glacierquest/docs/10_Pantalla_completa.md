# Juego a pantalla completa

Actualización visual del 16 de octubre de 2026, posterior al documento 09.

Publicada en la revisión `glacierquest-demo-00006-k72`, con Cloud Build `7d0447d8-a6cb-486b-8583-718e96febacf`. La portada pública y la conexión con Firebase se verificaron después del despliegue.

## Flujo de entrada

Al abrir la web aparece la portada **Glacier Quest** con el botón **Jugar**. Si ya hay una sesión válida, se recuperan el nombre y nivel sin entrar todavía al mundo. Al pulsar Jugar comienza la partida. Si falta una sesión, aparece el acceso por correo y código de clase; al completarlo se entra al mundo.

El mapa ocupa toda la ventana, sin página que desplazar ni paneles de misiones o chat debajo. La vida, experiencia, inventario y minimapa aparecen como indicadores flotantes.

## Herramientas

- **Misiones / Q**: abre el diario y las recompensas.
- **Chat / C**: abre la conversación; un punto avisa de mensajes nuevos recibidos mientras está cerrado.
- **Exploradores / P**: muestra jugadores conectados y permite desafiarlos.
- **Menú**: continuar, activar pantalla completa del navegador, vincular un invitado, consultar servicios, volver al inicio o cerrar sesión.
- **Esc**: cierra el panel; desde el mapa abre el menú.

Los paneles se superponen al mapa y solo uno se abre a la vez. Mientras están abiertos, el personaje deja de caminar, pero la sala multijugador sigue funcionando. La opción **Volver al inicio** conserva la sesión y pausa las consultas periódicas; no es una pausa global para otros jugadores. La presencia anterior puede tardar hasta 30 segundos en desaparecer.

El juego llena la ventana sin requerir permisos del navegador. La opción adicional **Pantalla completa** utiliza la función del navegador cuando está disponible; si no lo está, se informa al jugador y se conserva la vista que llena la ventana.

## Validación

Se revisaron visualmente la portada, entrada de invitado local, recuperación de sesión tras recargar, apertura de misiones, envío de chat local, menú y regreso al inicio. Se comprobaron la sintaxis JavaScript, referencias a elementos del documento e identificadores únicos. No hay cambios en la lógica del servidor, permisos de Firebase ni recursos cloud.

La cámara ajusta el área visible en pantallas grandes para no mostrar espacio fuera del mundo. Las consultas de sincronización se mantienen durante la partida y se suspenden en la portada o con la pestaña oculta.

## Ajuste local: interfaz compacta y chat

Cambios posteriores a la revisión publicada indicada arriba; todavía sin despliegue, commit ni push.

- HUD de personaje reunido en una tarjeta pequeña en la esquina superior izquierda.
- Diario, chat y grupo agrupados abajo a la derecha; inventario y conexión dentro del menú.
- Minimapa opcional, activable desde el menú, oculto inicialmente.
- Chat flotante de hasta 320 × 370 px en escritorio, limitado por la ventana en pantallas pequeñas. Burbujas con ajuste de palabras largas, lista desplazable y formulario fijo.
- La llegada de mensajes conserva la posición de lectura cuando se está revisando el historial; al enviar un mensaje propio se muestra el final.
- Sin cambios de servidor, frecuencia de sincronización, recursos cloud ni permisos.

Validación local: envío de mensajes, palabras sin espacios, apertura/cierre del diario y menú, activación del minimapa, recuperación de sesión y ausencia de desbordamiento horizontal a 1280 × 720 y 390 × 844. Pruebas existentes de combinación de mensajes correctas.
