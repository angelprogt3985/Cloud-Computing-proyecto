# Estimación de costos

Fecha de consulta: 6 de octubre de 2026, USD, región us-central1. Estimación de planificación, no cotización ni garantía de factura cero. No depende de créditos de bienvenida. Las cuotas pueden compartirse con otros proyectos o recursos de la cuenta.

## Escenario académico

Diez sesiones al mes de una hora, seis jugadores simultáneos y una demostración adicional de una hora con treinta jugadores. Polling cada cinco segundos, pestañas cerradas fuera de sesiones, 100 combates/mes y chat moderado. Por sesión pequeña: 6 × 720 = 4.320 solicitudes; cada sync lee 1 jugador + hasta 6 presencias + 1 documento de chat y escribe 1 presencia. Resultado: unas 34.560 lecturas y 4.320 escrituras por día de ensayo, más acciones y reintentos. Diez ensayos deben repartirse en días distintos para aplicar la cuota diaria como se estima.

Demo de 30 jugadores: 21.600 sync/h; hasta 32 lecturas/sync = 691.200 lecturas/h y 21.600 escrituras/h. Por tanto, el polling NO es gratis ilimitadamente. Con 50.000 lecturas y 20.000 escrituras gratuitas diarias disponibles, exceso aproximado de 641.200 lecturas y 1.600 escrituras. A USD 0,03/100.000 lecturas y USD 0,09/100.000 escrituras en Iowa, unos USD 0,194 para esa hora, antes de acciones, reintentos, almacenamiento y red. Redondear a USD 0,25 para operaciones de base de datos de esa demo. El conteo no incluye lecturas de consola ni reintentos de transacciones.

| Servicio | Supuesto y cuota relevante | Estimación mensual |
|---|---|---|
| Cloud Run | ~65.000 sync más acciones/estáticos; 11 horas × 2 instancias × 1 vCPU = 79.200 vCPU-s; 39.600 GiB-s a 512 MiB; debajo de cuotas si están disponibles | USD 0 de cómputo bajo supuestos; reservar USD 1 para salida y variación |
| Firestore | Ensayos bajo cuota diaria; demo excede lecturas; menos de 1 GiB total | USD 0,25 aproximados de operaciones; reservar hasta USD 1 |
| Cloud Storage | Un SVG pequeño, lecturas cacheadas, región elegible | Cercano a USD 0 con cuota; reservar USD 0,10 |
| IAM | Roles y federación | Sin cargo directo; productos accedidos se facturan |
| Secret Manager | 2 versiones y menos de 10.000 accesos/mes | USD 0 con cuota disponible |
| Logging y Monitoring | Menos de 1 GiB logs, métricas nativas, sin alertas métricas ni uptime checks provisionados | USD 0 bajo esas condiciones |
| GitHub Actions | ~20 builds × 5 min = 100 min Linux; depende del plan y consumo restante | USD 0 dentro del cupo; validar en cuenta |
| Artifact Registry | Ejemplo: 1 GiB-mes total de imágenes, 0,5 GiB gratis, USD 0,10/GiB-mes adicional | USD 0,05; medir tamaño real |

Estimación central con cuotas disponibles: ~USD 0,30 más salida de red y variaciones. Presupuesto de trabajo recomendado: USD 1-3 al mes; alertas a USD 5 y USD 10. El presupuesto es una reserva razonable para este uso, no un límite automático ni una promesa. Guatemala puede tener tarifa de salida distinta a la cuota de Cloud Run dentro de Norteamérica: revisar el destino en la calculadora y la factura.

## Si dejan treinta jugadores conectados

Una hora diaria durante treinta días implica aproximadamente 20,7 millones de lecturas. El exceso, descontando 50.000 diarias, cuesta alrededor de USD 5,77 solo en lecturas. Mantener dos instancias ocupadas durante 30 horas puede superar la cuota de CPU de Cloud Run. Dejar la app abierta durante días cambia radicalmente el escenario; el máximo de instancias no impide sumar horas o consultas.

## Ahorro frente al playbook

Firestore elimina la instancia SQL facturada por tiempo. Retirar Cloud CDN evita el balanceador externo: una regla de reenvío a USD 0,025/h suma USD 18,25 por 730 h, antes de procesamiento, transferencia y CDN. El supuesto de que todo salvo SQL era gratis no era correcto. El límite gratuito de Logging consultado es 50 GiB/proyecto/mes, no los 150 GB indicados en el playbook.

## Fuentes oficiales

- Firestore y precio regional: https://cloud.google.com/firestore/pricing
- Cloud Run y transferencia: https://cloud.google.com/run/pricing
- Storage: https://cloud.google.com/storage/pricing
- Secret Manager: https://cloud.google.com/secret-manager/pricing
- Observability: https://cloud.google.com/products/observability/pricing
- Artifact Registry: https://cloud.google.com/artifact-registry/pricing
- Balanceador: https://cloud.google.com/load-balancing/pricing
- GitHub Actions: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Calculadora para adjuntar estimación del equipo: https://cloud.google.com/products/calculator
