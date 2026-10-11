# Entregas de Glacier Quest

Revisión: 11 de octubre de 2026. Código revisado: `a3156bea6c08735b5d9fe4c3bfb1658f7bbc53ba`.

| Documento | Alcance |
| --- | --- |
| [Preentrega: IAM y GitHub Actions](preentrega.md) | Demostración acotada de identidades y validación continua, con evidencia histórica real. |
| [Entrega final: integraciones y pendientes](entrega-final.md) | Servicios adicionales ya integrados y trabajo de consolidación pendiente. |

La separación define qué se demuestra en cada entrega. No cambia el estado del proyecto, no elimina avances ni altera fechas. Un servicio fuera del alcance de la preentrega puede estar implementado en la versión actual.

La rama `codex/preentrega-iam-actions` contiene actualmente ambas etapas. Se conserva su nombre porque la confianza OIDC de Google Cloud depende de esa rama y del archivo del workflow. No renombrarla como parte de una reorganización documental.

## Referencias de las etapas

- `f4a1756`: autenticación IAM verificada desde Actions.
- `93cd5a2`: registro de esa etapa; referencia histórica para la demostración de preentrega.
- `c3253e4`: incorporación de la demo con Cloud Run, Storage y Secret Manager.
- `1ce7c9d`: acceso público con código de clase, según el cambio del propietario.
- `d190c95`: Firebase Realtime Database y limpieza autenticada.
- `a3156be`: mejoras posteriores de sincronización y chat en el código.

Estos commits son del 10 de octubre de 2026; no equivalen por sí solos a la hora de creación de cada recurso. Las ejecuciones de Actions y las revisiones de Cloud Run son las evidencias de operación.

Los documentos 01–08 y los PDF anteriores se conservan como antecedentes; no representan todos el mismo estado. Para presentar usar estos dos documentos y las evidencias enlazadas. No ejecutar scripts de despliegue o pruebas con escritura para producir nuevas capturas de preentrega.

