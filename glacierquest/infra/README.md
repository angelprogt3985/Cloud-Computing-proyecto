# Infraestructura por etapas

Cloud SQL PostgreSQL es la base prevista. No hay Firestore ni Cloud CDN. Por defecto enable_database=false y deploy_app=false. Consulte [despliegue](../docs/deployment-steps.md) y el [plan](../docs/02_Plan_de_servicios.md). Un apply puede crear recursos de preparación; revisar siempre el plan.
