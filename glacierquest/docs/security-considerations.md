# Consideraciones de seguridad

- Service accounts con permisos minimos (no usar cuentas default)
- Roles personalizados documentados en infra/terraform/iam.tf
- Cloud SQL sin IP publica expuesta, conexion via conector nativo de Cloud Run
- Secretos (.env, API keys) nunca comiteados al repositorio
cd ~/Cloud-Computing-proyecto
git add .
git commit -m "Documentar service accounts personalizadas para IAM"
git push

## Service accounts personalizadas

- glacierquest-api-sa@cloud-computing-508416.iam.gserviceaccount.com
  Rol: roles/cloudsql.client (minimo necesario para que Cloud Run se conecte
  a Cloud SQL, sin usar la cuenta de servicio default de Compute Engine
  que tiene permisos de Editor).

- glacierquest-cicd-sa@cloud-computing-508416.iam.gserviceaccount.com
  Rol: roles/run.developer (permiso restringido solo a desplegar en Cloud Run,
  usado por el pipeline de GitHub Actions).
