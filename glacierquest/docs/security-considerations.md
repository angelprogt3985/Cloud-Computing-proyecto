# Consideraciones de seguridad

- Service accounts con permisos minimos (no usar cuentas default)
- Roles personalizados documentados en infra/terraform/iam.tf
- Cloud SQL sin IP publica expuesta, conexion via conector nativo de Cloud Run
- Secretos (.env, API keys) nunca comiteados al repositorio
