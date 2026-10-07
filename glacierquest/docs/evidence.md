# Registro de evidencias

## Verificado localmente en esta iteración

- Siete pruebas de lógica/API aprobadas: contraataque, vulnerabilidad, defensa, curación, derrota, repetición de turno, recolección, sesiones, chat y errores.
- Simulación con 30 jugadores, 360 sync durante un minuto: sin errores; p95 de 117 ms. Backend en memoria. No extrapolar a Firestore ni a red de nube.
- Navegador: ingreso, movimiento por clic, acercamiento al guardián, ataque y contraataque visibles.
- Dependencias: auditoría npm sin vulnerabilidades reportadas después de actualizar proxy-addr y uuid mediante overrides. Es una revisión de dependencias, no una auditoría de seguridad completa.
- Terraform: formato y validate aprobados con Terraform 1.12.2 y proveedor Google 7.46.1. No se ejecutó plan contra una cuenta ni apply.

## Evidencia de nube pendiente

| Verificación | Estado | Evidencia que debe adjuntar el equipo |
|---|---|---|
| Proyecto con facturación | Pendiente | ID, región, captura sin datos sensibles |
| Cloud Run y Firestore conectados | Pendiente | URL y respuesta /health; documento persistido |
| Storage privado | Pendiente | Objeto, imagen en juego y prueba de lectura vía API |
| IAM y Secret Manager | Pendiente | Roles y referencias de versiones, nunca valores |
| CI/CD | Pendiente | URL de ejecución exitosa, commit y revisión |
| Observability | Pendiente | RequestId en logs y panel con datos |
| Carga real con 30 jugadores | Pendiente | Fecha, versión, región, p95 y fallos |
| Docker en entorno de despliegue | Pendiente | Build y arranque con variables de producción |

Completar cada fila solo después de ejecutarla. M2 requiere dos servicios desplegados, no dos pruebas locales.

## Guion de video de seis minutos

0:00-0:40: objetivo y diagrama, prioridad de integración de servicios. 0:40-1:30: dos navegadores, movimiento por clic y chat. 1:30-2:20: recoger objeto, recargar y mostrar el documento de Firestore. 2:20-3:10: duelo, anuncio de ventisca, defensa y recompensa persistente. 3:10-4:10: bucket privado, referencia de secreto y cuenta runtime. 4:10-5:10: ejecución de Actions, imagen y revisión desplegada; requestId en Logging y métricas. 5:10-6:00: costo mensual, limitaciones y siguiente trabajo. No declarar completada ninguna evidencia pendiente.
