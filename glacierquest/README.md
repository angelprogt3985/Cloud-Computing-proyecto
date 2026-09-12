# Glacier Quest

Proyecto del curso Cloud Computing 2026 - Universidad Galileo, FISICC.

Mundo social multijugador estilo Club Penguin con una capa minima de RPG
(encuentro Attack/Run con un NPC), desplegado sobre Google Cloud Platform.

## Estructura del repositorio

- `api/`   - Backend Node.js/Express, desplegado en Cloud Run
- `client/` - Frontend HTML5/Canvas (o Phaser), desplegado en Cloud Storage + Cloud CDN
- `infra/`  - Infraestructura como Codigo (Terraform) - bonus
- `.github/workflows/` - Pipelines de CI/CD (GitHub Actions)
- `docs/`   - Documentacion para la entrega: arquitectura, servicios, despliegue, costos, seguridad

## Servicios de GCP utilizados

Ver `docs/services-and-roles.md` para el detalle completo.

## Como correr localmente

(por definir una vez el backend y frontend tengan codigo base)
