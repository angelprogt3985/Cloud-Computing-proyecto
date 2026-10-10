> HIST�RICO (7 de octubre): sustituido por [arquitectura econ�mica](03_Arquitectura_economica.md) y [despliegue Firestore](despliegue-firestore.md). No seguir los pasos SQL para la ruta actual.

# Servicios y correspondencia con los labs

El plan actualizado está en [Plan de servicios](02_Plan_de_servicios.md) y su PDF.

Conteo principal: Cloud Run, Cloud SQL, Cloud Storage, IAM, Observabilidad (Logging y Monitoring juntos), GitHub Actions y Pub/Sub. Pub/Sub está planificado, no implementado ni desplegado. Secret Manager y Artifact Registry permanecen como apoyo técnico fuera del conteo. Terraform es herramienta de IaC, no un octavo servicio.

Los títulos confirman IAM, Storage, SQL, Observabilidad, Pub/Sub y Terraform. Cloud Run y GitHub Actions encajan en Serverless y DevOps/Deployment, pero los títulos no confirman la herramienta exacta del lab.
