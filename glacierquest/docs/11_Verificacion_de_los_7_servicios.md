# Verificación real de los siete servicios

Fecha: 16 de octubre de 2026, 13:34 (Guatemala). Proyecto: `glacier-quest-1791678996`.
Revisión activa: `glacierquest-demo-00006-k72`.

**Resultado: los siete componentes del conteo académico pasaron las comprobaciones funcionales.** Es una comprobación del estado actual, no una garantía de disponibilidad permanente. Logging y Monitoring se agrupan en una entrada, como en el plan del proyecto.

| Servicio | Evidencia comprobada |
| --- | --- |
| Cloud Run | Revisión Ready, página pública y API saludable; Firebase conectado. |
| Cloud Storage | El recurso servido por la API coincide byte por byte con el objeto del bucket privado. El acceso público directo se rechaza. |
| IAM | Servidor y constructor usan identidades separadas. Runtime tiene acceso a sus recursos y no tiene claves descargadas. Se rechazan peticiones sin sesión, firmas alteradas y limpieza anónima. |
| Secret Manager | Ambas versiones están ENABLED y referenciadas desde Cloud Run; la cuenta de ejecución tiene acceso. El código válido permite entrar y el incorrecto se rechaza. No se imprimen secretos. |
| Cloud Build | Build `7d0447d8-a6cb-486b-8583-718e96febacf` SUCCESS. Su digest coincide exactamente con la imagen desplegada. |
| Logging + Monitoring | Logs estructurados de la revisión actual. Panel creado, con datos reales en las cuatro gráficas: tráfico/HTTP, latencia p95, instancias y memoria. |
| Cloud Scheduler | Job habilitado con OIDC. Ejecución real eliminó presencia y chat vencidos de prueba y conservó presencia reciente y progreso. |

## Panel que faltaba

[Abrir Glacier Quest - Operacion de la demo](https://console.cloud.google.com/monitoring/dashboards/builder/f31ce3ca-de21-4b86-9fb6-5398625bc357?project=glacier-quest-1791678996).

Antes de esta revisión no existía un panel personalizado. Las métricas y los logs ya se recolectaban. Se creó el panel con esas métricas existentes y dos paneles de logs para Scheduler y errores/limpieza de la aplicación.

Las consultas exactas de las cuatro gráficas devolvieron datos. El informe final registró 226 puntos de tráfico, 31 de latencia, 314 de instancias y 120 de memoria en la ventana consultada de seis horas. Las métricas pueden llegar con demora; una gráfica sin puntos durante inactividad no demuestra por sí sola una caída. Este panel no configura notificaciones por correo ni chequeos sintéticos periódicos.

## Incidencia histórica encontrada

El 16 de octubre a las **11:17 de Guatemala**, una solicitud de Scheduler recibió HTTP 500 porque Cloud Run no tenía una instancia disponible en ese momento. Ocurrió en la revisión anterior `00003-p8q`. Los logs muestran que el reintento automático terminó con HTTP 200 a las **11:18**. Las ejecuciones de las **12:17 y 13:17** también terminaron con HTTP 200.

Se comprobó además una ejecución nueva de extremo a extremo contra la revisión actual. Se mantuvo la política de reintentos que ya recuperó el fallo, y el mínimo de cero instancias para conservar la configuración económica. No se cambió la facturación ni se añadió un servidor permanente.

## Repetir las pruebas

Desde la raíz del repositorio, con la cuenta autorizada autenticada en gcloud:

```powershell
python glacierquest/infra/demo/verify-services.py
python glacierquest/infra/demo/verify-scheduler.py
```

La primera prueba verifica los recursos reales, crea un jugador temporal y retira únicamente sus datos. No publica mensajes en el chat. La segunda crea registros desechables, dispara el job existente y verifica sus efectos; también retira sus fixtures al terminar. La limpieza normal del job puede procesar registros vencidos, como en su ejecución horaria habitual.

El informe de la primera prueba se guarda en `output/cloud-verification/servicios-verificados.json`. No incluye tokens, contraseñas ni valores de secretos.

Para recrear o actualizar únicamente el panel:

```powershell
python glacierquest/infra/demo/configure-monitoring.py
```

La configuración versionable está en `infra/demo/monitoring-dashboard.json`. El script reutiliza un panel con el mismo nombre y conserva su control de versión mediante ETag; no aplica el Terraform de etapas anteriores.

Firebase Realtime Database y Authentication siguen siendo complementos fuera del conteo académico. Artifact Registry continúa almacenando las imágenes del servidor. La aceptación académica de la agrupación depende de los criterios del docente.
