# Iteración: tienda, fichas y equipo — 18 de octubre de 2026

Esta versión se publica en GitHub después de las pruebas locales. No se ha desplegado en cloud: el registro 15 describe la versión anterior que sí está en cloud.

## Cambios terminados

- Cartera pequeña con monedas y peces siempre visibles durante el juego.
- Vista previa del avatar en la ficha propia y en las fichas públicas, usando el mismo dibujo del mundo.
- Colores gratuitos y armario para equipar los accesorios que ya se poseen.
- Tienda Boreal en la cabaña: acercarse y pulsar E o Interactuar. La ficha ofrece un botón para caminar hacia ella. Las compras ya no están en la ficha.
- Las fichas ajenas muestran nombre del jugador, nivel y apariencia; no incluyen saldo, inventario ni nombres de accesorios.
- Equipo con ventajas y desventajas para los duelos entre jugadores. El servidor calcula los valores a partir de accesorios comprados; no acepta estadísticas enviadas por el cliente.

| Accesorio | Precio en monedas del juego | Vida del duelo | Daño base |
| --- | ---: | ---: | ---: |
| Sin accesorio / gorro | 0 / 6 | 40 | 10 |
| Bufanda | 9 | 44 | 9 |
| Gafas | 12 | 36 | 11 |

Se equipa un accesorio a la vez. Los valores quedan fijados al enviar la invitación al duelo, para evitar cambios durante la pelea. No modifican la vida del mundo ni el combate contra el guardián. Esto añade una decisión de equipo, pero todavía no resuelve todo el balance ni sustituye el futuro rediseño del combate.

## Servicios y presupuesto

Se reutiliza la persistencia de perfiles en Firebase Realtime Database, sus transacciones de compra y la sincronización existente. El catálogo se conserva en memoria del cliente después de consultarlo. No se agregaron servicios cloud, tareas periódicas ni lecturas periódicas adicionales para la tienda.

Las comprobaciones de esta iteración se hicieron en memoria local y con dobles de prueba de Firebase. No acreditan una nueva prueba real de persistencia cloud. No se desplegó ni se generó tráfico de prueba en producción. La infraestructura que ya estaba desplegada conserva su configuración y sus posibles costes normales.

## Validación

48 pruebas automatizadas locales aprobadas: compras y saldo, privacidad de perfiles, equipo no comprado o estadísticas manipuladas, instantánea al invitar, defensa y curación, compatibilidad con duelos antiguos y terminación de todas las combinaciones de equipo. También se comprobó la sintaxis del cliente y el formato del diff.

La revisión visual de escritorio verificó el cambio de color y su vista previa, el acceso a la tienda desde la ficha, el catálogo con sus tres avatares y la desactivación de compras sin saldo. No se completó una revisión visual móvil ni una compra de extremo a extremo desde el navegador; la lógica de compra sí está cubierta por las pruebas automatizadas.

## Cómo probar

1. Ejecutar `start-local.cmd` desde `glacierquest` y abrir http://127.0.0.1:8080.
2. Pulsar Jugar y crear un explorador con «Probar sin cuenta (solo local)».
3. Abrir Mi explorador, cambiar el color y usar «Ir a la Tienda Boreal».
4. Recoger monedas del mapa, volver a la tienda e interactuar. Dos recogidas de tres monedas permiten comprar el gorro.
5. Abrir el armario y equipar la compra. Para un duelo usar dos perfiles de navegador separados; dos pestañas normales comparten la cuenta.
6. Ejecutar `test-local.cmd` para repetir las pruebas. Al cerrar el servidor local se pierde el progreso de prueba.

## Próximo paso

Esta iteración ya constituye un cambio funcional suficiente para una prueba breve en cloud cuando se publique: dos cuentas, compra, reconexión, ficha pública e invitación con equipo. No hace falta mantener sesiones abiertas ni efectuar pruebas de carga.

Quedan para otras iteraciones los ataques y recursos estratégicos del combate, nuevas zonas separadas, amigos e iglús. Se conserva el trabajo previo de chat y burbujas.
