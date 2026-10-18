# Glacier Quest — actualización sobre la base del compañero

17 de octubre de 2026. Esta entrega parte de `Cloud Computing proyecto.zip`; no sustituye sus avances por la versión anterior. El código se publicó en `main` y se desplegó después de la aprobación del usuario. Consulta el [registro de publicación y comprobaciones reales](glacierquest/docs/15_Despliegue_2026-10-17.md).

## Probar

1. Instalar Node.js 22 o superior.
2. Abrir `glacierquest/start-local.cmd` y visitar `http://127.0.0.1:8080`.
3. Pulsar Jugar, escribir un nombre y seleccionar «Probar sin cuenta (solo local)». No introducir credenciales cloud.
4. Pulsar el propio pingüino o «Mi explorador»: consultar estadísticas, elegir color, comprar y equipar accesorios.
5. Las monedas recogidas sirven para comprar gorro (6), bufanda (9) o gafas (12). Recoger dos monedas de 3 permite comprar el gorro. Los cuatro colores son gratuitos.
6. Para dos personas locales usar dos perfiles de navegador o uno normal y otro privado. Dos pestañas normales comparten la sesión guardada de esta base.
7. Para las pruebas automatizadas abrir `glacierquest/test-local.cmd`.

En memoria el progreso desaparece al detener el servidor. El despliegue usa los perfiles existentes de Realtime Database y cuentas Firebase. Se comprobó su conexión real; queda la prueba funcional manual de compras y recuperación con dos cuentas descrita en el registro de publicación.

- [Cambios, pruebas y pendientes](glacierquest/docs/13_Cambios_y_siguiente_paso.md).
- [Auditoría de servicios y alcance de la comprobación](glacierquest/docs/12_Servicios_y_alcance_2026-10-17.md).

El paquete incluye código, workflows y documentos del proyecto. Se excluyen dependencias descargables, cachés, copias de entregas antiguas, archivos de entorno y estado de Terraform. El ZIP original queda intacto.
