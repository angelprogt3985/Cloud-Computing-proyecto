# Servicios de nube utilizados y su rol

| Categoria | Servicio GCP | Rol en el proyecto |
|---|---|---|
| Compute | Cloud Run | Hospeda la API REST de Node.js/Express |
| Base de datos | Cloud SQL (PostgreSQL) | Datos de jugadores, inventario, stats |
| Almacenamiento | Google Cloud Storage | Assets estaticos del cliente |
| Redes | Cloud CDN | Cache y entrega de assets estaticos |
| Seguridad | Cloud IAM | Roles personalizados para API y CI/CD |
| Monitoreo | Cloud Monitoring / Logging | Uptime, errores, rendimiento de la BD |
| CI/CD | GitHub Actions | Build y deploy automatico a Cloud Run y Storage |
| IA | Gemini / Agent Platform API | Dialogo generado del NPC (Old Sage) |

(completar con detalles de integracion de cada servicio)
