> Actualizaci�n: ver [gu�a vigente desde cero](04_Conexion_paso_a_paso.md). Tasks y Scheduler sustituyen el plan anterior de Pub/Sub; ambos siguen pendientes. No aplicar Terraform sobre recursos creados manualmente sin importarlos.

# Glacier Quest: arquitectura económica y siguiente etapa

Decisión del 10 de octubre de 2026. Sustituye el plan técnico del 7 de octubre. Los PDF 01 y 02 del ZIP anterior describen aquella preentrega, no esta arquitectura. Investigación con fuentes oficiales; no se ha desplegado ni contratado infraestructura.

## Decisión

Usar Cloud Run para web/API y Firestore Standard en modo Native para datos. Mantener siete servicios candidatos a evaluación sin contar Firestore: Cloud Run, Cloud Storage, IAM, Secret Manager, Observabilidad, GitHub Actions y Pub/Sub. Artifact Registry es apoyo y no hace falta depender de su aceptación para llegar al mínimo. Terraform es IaC, no otro servicio.

El documento del curso sí menciona Firestore gestionado desde GCP entre las bases permitidas. La instrucción actual del equipo es más conservadora: se permite usarlo pero no se cuenta. Se sigue esa instrucción. El docente decide la aceptación del conteo; configurar recursos sin integrarlos no demuestra cumplimiento. Secret Manager es un candidato justificable por su función real, aunque no aparece por nombre en los ejemplos de la rúbrica.

La prioridad es reducir costo fijo y esfuerzo operativo. No incorporar servicios solo porque tengan cuota gratuita. No duplicar Cloud Build y GitHub Actions para hacer el mismo despliegue.

## Servicios elegidos y prueba visible

| Servicio | Propósito concreto | Evidencia que falta reunir en nube |
|---|---|---|
| Cloud Run | Servir web y API; más adelante un consumidor privado de eventos | Abrir HTTPS, jugar y ver revisión y solicitudes |
| Cloud Storage | Entregar recursos del juego desde un bucket privado; empezar con el banner existente y después catálogo de mapas/sprites | Cambiar el objeto y verlo en el juego después de renovar caché |
| IAM | Separar runtime, despliegue y consumidor; limitar permisos; federar GitHub sin claves JSON | Roles, identidades y una operación denegada a una identidad sin acceso |
| Secret Manager | Clave que firma sesiones y código de acceso de clase, fuera del código | Referencias de versiones en Cloud Run y rotación sin revelar valores |
| Logging + Monitoring | Investigar errores y medir latencia/tráfico | Buscar requestId y mostrar panel con datos reales; se cuentan juntos |
| GitHub Actions | Probar, construir y desplegar una revisión reproducible | Ejecución que despliega un commit y verifica salud |
| Pub/Sub | Desacoplar victorias del historial/estadísticas, con reintentos | Victoria del juego recibida por consumidor; duplicados sin repetir actividad |

Firestore conserva jugadores, inventario, combate, chat y presencia. El cliente solo llama a la API; el servidor usa la biblioteca oficial de Google Cloud e IAM. No se coloca una clave de servicio en el navegador. Artifact Registry almacena las imágenes que realmente despliega Cloud Run, con limpieza de antiguas. Ambos tienen propósito aunque no entren en el conteo principal.

## Alternativas evaluadas

| Alternativa | Decisión | Motivo para este proyecto |
|---|---|---|
| Cloud SQL | Conservar código anterior como alternativa, no desplegarlo | Motor y disco generan costo mientras se conserva la instancia; no necesitamos SQL relacional |
| Firestore Standard | Elegida | Documentos por jugador y transacciones; pago por uso sin servidor SQL reservado |
| Compute Engine | No seleccionada | Añade mantenimiento del sistema y servidor; no hace falta para ejecutar Express |
| GKE/Kubernetes | No seleccionada | Añade clúster, permisos y despliegue complejo sin necesidad de orquestación actual |
| Cloud Tasks | Reserva para futuras expediciones que terminan después de un tiempo | Es una cola de trabajo con ejecución/reintentos; no aporta todavía si solo hay combates inmediatos |
| Cloud Scheduler | Reserva para limpieza o eventos diarios reales | Barato, pero no añadirlo antes de tener una tarea periódica necesaria |
| Pub/Sub | Elegida, siguiente etapa | Evento de dominio demostrable, consumidor independiente y recuperación de fallos |
| Secret Manager | Elegida; compensa retirar SQL del conteo | Ya hay dos secretos reales; separación y rotación útiles |
| Artifact Registry | Apoyo | Necesario para el contenedor, pero no depender del doble conteo de almacenamiento |
| Cloud Build | No junto con Actions | Duplicaría el pipeline existente |
| Vertex AI / Gemini | No por ahora | El enemigo usa reglas deterministas; generación de texto no resuelve una necesidad actual |
| CDN / balanceador / dominio propio | No por ahora | La URL HTTPS nativa de Cloud Run basta para entrar a la demo |

Cloud Tasks tiene un millón de operaciones mensuales gratuitas; Scheduler tres jobs por cuenta de facturación, luego USD 0,10/job/mes. Esto no vuelve necesarias esas herramientas: se mantienen como alternativas, no como recursos creados.

## Arquitectura y secuencia

Navegador -> Cloud Run API -> Firestore y Cloud Storage.

GitHub Actions -> Artifact Registry -> nueva revisión Cloud Run.

IAM autoriza esas relaciones. Secret Manager entrega dos secretos. Logging/Monitoring reciben evidencia operativa.

Siguiente integración: transacción de victoria -> evento pendiente en Firestore -> publicador -> Pub/Sub -> consumidor privado en Cloud Run -> historial en Firestore -> vista de actividad del jugador.

El consumidor es otra carga de Cloud Run, no otro servicio contado. Se prefiere entrega push autenticada para no mantener un consumidor sondeando continuamente. La identidad de Pub/Sub tendrá invocación solo sobre ese servicio privado. No enviar eventos internos al endpoint público del juego sin autenticar su origen.

La recompensa se confirma con el estado del combate en Firestore. La misma transacción guardará un evento de salida con ID estable basado en la batalla. Publicar después del commit y esperar el resultado antes de terminar la petición; si falla, el evento sigue pendiente. Un job finito de recuperación, invocado manualmente en esta etapa, reenviará pendientes. No depender de trabajo en segundo plano después de responder, porque Cloud Run puede suspender CPU.

Pub/Sub puede entregar más de una vez. El consumidor persistirá una sola actividad por ID de evento y responderá éxito solo después del commit. Si publica y falla antes de marcar el evento como enviado, el reintento será seguro. No otorgar monedas en el consumidor. Pruebas: victoria, entrega, duplicado, fallo de publicación y recuperación, fallo del consumidor y reentrega. Esta cadena sigue pendiente: no hay publicador ni consumidor en la versión actual.

## Costos: objetivos y supuestos, no una garantía

Referencia us-central1; USD; cuotas verificadas el 10 de octubre de 2026. No se presupuestan créditos promocionales. Facturación habilitada puede ser necesaria incluso si el uso queda cubierto por cuotas. Varias cuotas se comparten por cuenta de facturación; no se multiplican creando proyectos.

| Componente | Cuota o regla útil | Control propuesto |
|---|---|---|
| Cloud Run por solicitud | 2 millones de solicitudes, 180.000 vCPU-seg y 360.000 GiB-seg/mes de referencia | Min 0, max 2, 1 CPU y 512 MiB; no conexiones persistentes inicialmente |
| Firestore Standard | Una base elegible por proyecto: 1 GiB, 50.000 lecturas/día, 20.000 escrituras/día y 20.000 borrados/día | Consultas limitadas y caché; transacciones en acciones, no por cada cuadro de animación |
| Secret Manager | 6 versiones activas y 10.000 accesos/mes gratuitos | Dos secretos; retirar versiones antiguas cuando corresponda |
| Pub/Sub | Primeros 10 GiB/mes de entrega básica por cuenta | Mensajes pequeños solo en victorias; reintentos acotados y manejo de fallos |
| Artifact Registry | Primeros 0,5 GiB-mes gratuitos; excedente y transferencia aparte | Imagen pequeña, conservar tres versiones y limpiar antiguas |
| Logging | Primeros 50 GiB/proyecto/mes de ingesta, retención predeterminada | No registrar cuerpos, tokens ni estados completos |
| Monitoring | Métricas nativas de Google Cloud sin costo de ingesta | Panel nativo; evitar métricas personalizadas y sondas permanentes por ahora |
| Cloud Storage | Free Tier regional sujeto a ubicación y operaciones | Unos pocos MB de recursos, caché y misma región; transferencia aparte |
| Actions | Depende del plan, privacidad del repo y minutos disponibles | Despliegue manual; comprobar minutos antes de automatizar cada push |

Escenario orientativo: 30 personas, una hora al día, 30 días, una instancia activa de 1 CPU y 512 MiB. Son 108.000 vCPU-seg y 54.000 GiB-seg de tiempo de sesión, antes de arranques y procesamiento adicional. Si hay dos instancias activas toda la hora, la CPU llega a 216.000 vCPU-seg: ya supera el cupo de referencia. No suponer que dos instancias cuestan igual que una.

Con sincronización cada cinco segundos, 30 jugadores generan 21.600 solicitudes/hora y otras tantas lecturas de jugador en el código actual. Con caché de sala de diez segundos, hasta 70 documentos por consulta y una instancia, se agregan aproximadamente 25.200 lecturas/hora: total aproximado 46.800 antes de chat, combate, salud y reintentos. Con dos instancias esa parte de caché puede duplicarse. La presencia limitada a una escritura cada diez segundos por jugador/instancia ronda 10.800 escrituras/hora con una instancia. Estas cuentas muestran que un ensayo breve puede acercarse al cupo diario; no prometen cero costo para sesiones largas.

El modo económico reduce la frescura de presencia/chat: otros jugadores pueden verse con unos 10-20 segundos de retraso, más red y sondeo del cliente. El movimiento propio sigue animado. Es una base de demo económica, no todavía un MMO fluido. Medir antes de decidir si reducir intervalos y pagar más operaciones. Las cuotas de Firestore son diarias: no se compensa un día intenso con días sin uso.

Objetivo de planificación para ensayos breves: acercarse a USD 0 de uso dentro de cuotas; reservar USD 5 al mes como margen inicial, no como factura estimada ni límite automático. No es honesto fijar un total sin medir duración, número de instancias, operaciones, tamaño de respuestas y transferencia a Guatemala. No asumir que una exención de salida hacia Norteamérica cubre todo el tráfico de los participantes. Alertas sugeridas USD 1/3/5; las alertas no detienen gastos. Max instances tampoco es un tope monetario.

No se configuran backups, PITR ni TTL automático de Firestore en esta etapa. Esas prestaciones tienen cargos propios y los datos no están respaldados por esta entrega. Diseñar una limpieza manual por lotes para chat/presencia antiguos y pruebas de restauración antes de guardar progreso importante. No ejecutar borrados automáticos de datos existentes sin revisar retención.

## Qué se cambió ahora

- Adaptador Firestore con SDK de servidor y transacciones para mutaciones de jugador.
- Caché de sala por instancia, deduplicación de consultas simultáneas y reducción de escrituras de presencia. Los errores no se guardan como éxito.
- Panel de servicios identifica Firestore fuera del conteo y Pub/Sub pendiente.
- Cloud Run preparado para Firestore, sin montaje ni credenciales SQL; pipeline verifica database=firestore.
- Terraform agrega Firestore protegido contra borrado y rol datastore.user para runtime. Usar proyecto dedicado: ese rol da acceso a los datos del proyecto, no restringe por colección.
- SQL queda como alternativa heredada desactivada; enable_database debe seguir false. El Terraform actual despliega la app con Firestore.
- Nueve pruebas locales aprobadas y Terraform validate correcto. Instalación auditada sin vulnerabilidades reportadas.

Pendiente: ejecutar la prueba de integración contra emulador Firestore, probar la base real, aplicar infraestructura en la cuenta del equipo, ejecutar Actions y completar Pub/Sub. Las pruebas de caché usan dobles de prueba; no validan permisos IAM ni las transacciones del servicio real. No se migraron datos SQL, no se desplegó nada y no se pagaron recursos.

## Pasos siguientes, en orden

1. Emulador Firestore: probar turnos concurrentes y persistencia. Resolver esa prueba antes de anunciar el adaptador como validado en nube.
2. Proyecto dedicado, facturación y alertas; revisar plan Terraform. Crear Firestore/Storage/secretos y desplegar una revisión del juego.
3. Ensayo de 30 minutos con pocos jugadores: registrar lecturas, escrituras, tiempo facturado, latencia y logs. Ajustar intervalos con esos datos.
4. Completar outbox, Pub/Sub y consumidor privado, con historial visible y pruebas de reintentos.
5. Ejecutar pipeline real y documentar siete servicios con evidencia. Ensayar con varias personas y actualizar costo medido.

No hace falta decidir servicios nuevos en cada etapa: esta selección cubre las necesidades del alcance. Añadir Scheduler o Tasks solo si aparece su función concreta.

## Fuentes oficiales

- Cloud Run: https://cloud.google.com/run/pricing
- Firestore Standard: https://firebase.google.com/docs/firestore/pricing
- SDK servidor: https://docs.cloud.google.com/firestore/native/docs/create-database-server-client-library
- Seguridad IAM de Firestore: https://docs.cloud.google.com/firestore/native/docs/security/iam
- Emulador: https://docs.cloud.google.com/firestore/native/docs/emulator
- Transacciones: https://firebase.google.com/docs/firestore/manage-data/transactions
- Secret Manager: https://cloud.google.com/secret-manager/pricing
- Pub/Sub: https://cloud.google.com/pubsub/pricing
- Pub/Sub y Cloud Run: https://docs.cloud.google.com/run/docs/tutorials/pubsub
- Storage: https://cloud.google.com/storage/pricing
- Artifact Registry: https://cloud.google.com/artifact-registry/pricing
- Observabilidad: https://cloud.google.com/products/observability/pricing
- Tasks: https://cloud.google.com/tasks/pricing
- Scheduler: https://cloud.google.com/scheduler/pricing
- Actions: https://docs.github.com/en/billing/concepts/product-billing/github-actions
