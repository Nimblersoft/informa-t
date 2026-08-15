# Spec: Motor de análisis de texto

## Alcance

El motor local recibe texto de 20 a 20.000 caracteres, extrae hasta tres aseveraciones bajo `claim-extraction.v1`, recupera evidencia oficial con el proveedor AI Search inyectado y solicita en paralelo tres propuestas no vinculantes bajo `proposal.v1`. No expone interfaz, no usa HTTP directo, KV, secretos ni emite decisiones editoriales.

## Contratos

- Cada aseveración conserva texto literal, texto normalizado, índices de inicio y fin, entidades, fechas, verificabilidad, relevancia electoral y disponibilidad de fuentes.
- Una aseveración excluida requiere uno de: `opinión`, `predicción`, `retórica` o `ambigüedad`.
- Las propuestas de GLM, Gemma y Nemotron reciben el mismo objeto de aseveración, evidencia y esquema `proposal.v1`; su única salida es un foco de revisión no vinculante.
- La evidencia se obtiene mediante `AiSearchProvider`; ausencia o metadatos incompletos conservan `Evidencia insuficiente`.

## Resiliencia y trazabilidad

- El presupuesto total predeterminado es 90.000 ms y se propaga como `AbortSignal`.
- Cada respuesta inválida recibe exactamente un intento de reparación; una segunda respuesta inválida queda como fallo estructurado.
- Errores de cuota, indisponibilidad y tiempo agotado se conservan como limitaciones en español y eventos de traza redactados.
- Se produce una síntesis solo si existen al menos dos propuestas válidas que compartan el mismo foco de revisión. No representa un veredicto editorial.
