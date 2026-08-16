# Spec: Auditoría de extracción de aseveraciones

## Alcance

El Worker persiste decisiones del extractor en D1 mediante el binding privado `AUDIT_DB`. La auditoría sirve para inspección operativa interna durante siete días; no tiene endpoint HTTP, interfaz pública ni exportación adicional.

## Datos permitidos

Cada fila contiene `analysis_id`, `claim_index`, `trace_event_id`, el claim literal (`claim_text`), `extractor_decision`, `pipeline_disposition`, `rationale`, proveedor, modelo, `prompt_version`, `pipeline_version`, `canonical_hash`, `degradations_json`, `created_at` y `expires_at`. La clave primaria `(analysis_id, claim_index)` hace idempotente el batch con `INSERT OR IGNORE`.

No se persisten el body completo, la URL o texto fuente completo, IP, cabeceras, secretos, resultados editoriales ni cadenas de pensamiento. El límite de tres claims por extracción acota el volumen.

## Retención y acceso

Las filas expiran a los siete días y el Cron Trigger `17 * * * *` elimina las vencidas. Las consultas operativas se realizan únicamente mediante Dashboard o Wrangler con permisos de la cuenta; la aplicación no expone listado ni lectura.

## Tiempo de espera y fallos

La ruta espera como máximo cinco segundos solo por el `D1Database.batch()`. La falta de binding, timeout o error de D1 produce la misma limitación en español en `claim.extracted.data.degradations`, `analysis.completed.data.degradations` y `analysis.completed.data.limitations`. Evidencia y propuestas no se cancelan; el terminal se fuerza a `partial`.
