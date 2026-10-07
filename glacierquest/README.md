# Glacier Quest 0.2

Avance del curso Cloud Computing 2026. Mundo social pequeño con movimiento por clic, chat, objetos persistentes y duelo por turnos. El foco es demostrar servicios de nube.

## Probar ahora en Windows

Abrir `start-local.cmd` y visitar http://localhost:8080. Requiere Node.js 22 o superior. Elegir nombre y dejar el código de clase vacío. Abrir otra pestaña para un segundo jugador.

También puede iniciarse desde esta carpeta:

```powershell
npm ci --ignore-scripts --prefix api
npm start --prefix api
```

El modo local usa memoria y un recurso visual local. Se identifica así en pantalla y pierde datos al reiniciar el servidor. No necesita Docker, PostgreSQL ni una cuenta GCP. No abrir index.html directamente: el servidor entrega web y API juntas.

## Qué cambió

- Clic o toque para moverse; flechas como alternativa con el mapa enfocado.
- Enemigo con salud, contraataque y patrón anunciado; ataque, defensa, dos curaciones y retirada.
- Sesiones firmadas por jugador, recompensa transaccional y recolección sin duplicados.
- Firestore vía GCP reemplaza SQL; Storage privado conserva el banner; Cloud Run ofrece HTTPS sin balanceador/CDN.
- Panel de servicios que distingue modo local, conexión comprobada y evidencia pendiente.
- Terraform, Docker, CI y despliegue manual por GitHub Actions con identidad federada.

## Estado real

Juego y API probados localmente; infraestructura validada con Terraform. No se desplegó en GCP: faltan ID del proyecto, facturación, acceso y repositorio. La entrega M2 del 9 de octubre exige dos servicios realmente activos; el modo local no cumple ese requisito.

## Documentación

- `docs/architecture.md`: arquitectura, ocho servicios y correspondencia con la rúbrica.
- `docs/deployment-steps.md`: preparación, secretos, despliegue y CI/CD.
- `docs/cost-estimate.md`: escenarios y fuentes de precios.
- `docs/security-considerations.md`: IAM, sesiones y límites.
- `docs/testing.md` y `docs/evidence.md`: pruebas y guion de presentación.
- `docs/Glacier_Quest_Avance.pdf`: informe para compartir.

Las carpetas de código SQL anterior fueron retiradas de esta versión; no se migró ni eliminó una base externa. Los documentos originales de referencia permanecen intactos. Los workflows están en la raíz del repositorio, fuera de glacierquest.
