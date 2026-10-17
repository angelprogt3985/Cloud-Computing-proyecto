# Cambios y siguiente paso

17 de octubre de 2026. Base: ZIP del compañero. Se conservaron cuentas, experiencia, misiones, pesca, mundo grande y PvP existentes.

## Terminado en esta sesión

| Cambio | Resultado | Relación con cloud |
| --- | --- | --- |
| Chat temporal | Ventana visible de dos minutos, sin historial anterior al inicio de una nueva sesión. Al volver a entrar al mapa el cliente también vacía su vista. | Consultas de Realtime Database limitadas por fecha; Scheduler retira mensajes vencidos con la protección de concurrencia existente. |
| Burbujas | Una por emisor, cinco segundos, tres líneas como máximo, abreviadas si hace falta. Nombre repetido no confunde identidad. | Reutiliza mensajes y sincronización existentes; no añade consultas periódicas. |
| Ficha del personaje | Clic sobre jugador o botón «Mi explorador». Salud, nivel, experiencia y cartera dejan de estar permanentemente sobre el mapa. | API devuelve únicamente los campos de ficha; no revela metadatos internos de vinculación/recompensas. |
| Avatar y armario | Cuatro colores gratuitos y tres accesorios; compra y equipamiento separados. No modifican estadísticas de combate. | Se guardan dentro del perfil, mediante la misma transacción de jugador que usa el proyecto. Precios, propiedad y saldo se validan en servidor. |
| Panel de servicios | Explica función, estado local/configurado/comprobado y evidencia pendiente. Incluye Authentication. | No inventa pruebas de IAM/secretos ni consulta todo Google Cloud automáticamente. |
| Ahorro y pruebas locales | Caché de Storage compartida entre panel y recurso; aisladas las variables de Firebase Auth, datos y secretos al arrancar local. | Evita descargas repetidas y contactos involuntarios con Firebase desde pruebas locales. |

Las compras repetidas no cobran dos veces. Los perfiles antiguos siguen funcionando sin migración masiva. La apariencia se incorpora a la presencia y se actualiza con la sincronización de la sala existente. Consultar una ficha o comprar añade una solicitud solo cuando el usuario realiza esa acción.

## Qué significa «chat temporal»

No se crea un archivo de conversaciones ni se expone el historial de días anteriores. Sin embargo, Realtime Database almacena brevemente mensajes para compartirlos entre instancias/jugadores. Dejan de mostrarse a los dos minutos, aunque sigan físicamente almacenados hasta la limpieza.

Scheduler conserva su periodicidad existente; **no se aumentó la frecuencia**. Cada ejecución elimina hasta 20 registros por colección dentro de un tiempo acotado. Un historial antiguo grande puede necesitar varias ejecuciones. Pausar Scheduler impide que esta eliminación física avance. No se borraron datos cloud en esta sesión. Los adaptadores alternativos Firestore/PostgreSQL reciben filtro temporal, pero no una nueva limpieza física; la demo actual usa Realtime Database.

Los tokens anteriores a esta versión siguen siendo compatibles: API limita a dos minutos; el cliente nuevo descarta el historial al entrar al mapa. Los tokens emitidos por esta versión también contienen la fecha de inicio firmada, usada por el servidor para filtrar mensajes anteriores.

## Validación

43 pruebas locales aprobadas: regresiones existentes de cuentas simuladas, progreso, pesca, combate y arena; TTL y consultas acotadas; burbujas y bordes; compras, propiedad y precios; compras HTTP concurrentes sin cobro doble; identidad del emisor no suplantable; perfil con campos públicos; estados de servicios sin exposición de secretos. Pruebas de Firebase con respuestas simuladas, no con la cuenta real.

Revisión visual local completada: recogida de dos monedas (saldo 6), compra de gorro (saldo 0), equipamiento confirmado, color lila guardado y burbuja visible sobre el avatar. La ficha concentra las estadísticas y el mapa queda despejado. También se verificó la sintaxis de los dos módulos principales del cliente.

La evidencia de los siete servicios del 16 de octubre se conserva como antecedente. El intento actual de consultar `/health` mediante la herramienta web no obtuvo una respuesta HTTP utilizable; no se declara el servidor caído ni verificado hoy. Ver documento 12.

## Queda fuera de esta entrega

- Mapas separados con portales, presencia y chat por zona.
- Combate con energía para gastar en varias acciones, habilidades variadas y pasivas equipadas. Mantener pocas opciones: ataque básico, técnica costosa, defensa/recarga y habilidad especial. Diseñar y probar equilibrio antes de añadirlas al PvP.
- Armas y armaduras con estadísticas. El armario actual es cosmético para conservar las reglas y el equilibrio del duelo existente.
- Lista persistente de amigos, solicitudes y aceptación.
- Iglú propio, decoración y permisos de visita.

Orden sugerido: zonas separadas → combate estratégico → equipo con compensaciones → amigos e iglús. Cada bloque debe tener pruebas locales de separación de datos, concurrencia y persistencia antes de conectarse al despliegue.

## Próxima prueba real: ya es razonable coordinarla

Este conjunto cambia campos persistidos de avatar/compras, consultas de chat y el criterio de limpieza. **Sí justifica una ventana cloud breve después de revisar el paquete local**; se avisa al usuario para coordinarla, no se despliega automáticamente.

Antes: actualizar gasto acumulado (objetivo US$10, evitar superar US$20), identificar revisión anterior para revertir y asegurar que no haya modificaciones paralelas del compañero. Desplegar solo la imagen revisada, sin ejecutar Terraform general ni volver a aprovisionar servicios.

Ventana propuesta: dos cuentas de prueba, 10–15 minutos. Comprar/equipar una vez, salir y recuperar el perfil; comprobar apariencia del otro jugador; enviar mensaje y verificar que un recién llegado no lo ve, y que caduca a los dos minutos; comprobar limpieza por Scheduler sobre datos desechables y sin tocar progreso; revisar errores. Registrar commit o hash del paquete, build, digest y revisión. No repetir scripts de carga ni crear cuentas en masa.

Al terminar, cerrar clientes y acordar pausa del job si no es necesario mantenerlo activo. No se modificó infraestructura, facturación, IAM ni jobs en esta sesión. Pausar actividad no elimina costos de almacenamiento ni garantiza gasto cero.
