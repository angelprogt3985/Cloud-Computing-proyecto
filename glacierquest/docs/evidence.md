# Evidencias

- Lógica y API local: ejecutar npm test y conservar resultado.
- Terraform: formato y validate comprobados después de sustituir la base por Cloud SQL. No se ejecutó apply.
- Dependencias: npm reportó cero vulnerabilidades durante instalación de esta versión.
- PostgreSQL real, Docker, IAM, secretos y conexiones cloud: pendientes de verificar en entorno destino.
- Prueba anterior de carga en memoria: 30 jugadores, 360 sync, p95 117 ms. No representa rendimiento cloud.

Para cada servicio desplegado registrar fecha, commit, evidencia y responsable. No marcar un recurso como activo solo por existir su código Terraform. El estado formal M2 de dos servicios desplegados continúa pendiente.

- Pub/Sub del lab 18: únicamente diseñado; topic, SDK, job, tablas y pruebas pendientes. No cuenta como integrado todavía.
