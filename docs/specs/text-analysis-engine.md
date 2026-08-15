# Spec: Motor de análisis de texto

## Alcance

El motor local recibe texto de 20 a 20.000 caracteres, limita la entrada enviada a extracción a 15.000 caracteres y registra una degradación en español si la recorta. Extrae hasta tres aseveraciones bajo `claim-extraction.v2`, recupera evidencia oficial con el proveedor AI Search inyectado y solicita en paralelo tres propuestas no vinculantes bajo `proposal.v1`. La extracción usa `openai/gpt-5.6-luna` mediante OpenRouter cuando está disponible; su salida puede incluir un `rationale` breve para enmarcar la revisión posterior. No expone interfaz, no usa KV, secretos ni emite decisiones editoriales.

## Contratos

- Cada aseveración conserva texto literal, texto normalizado, índices de inicio y fin, entidades, fechas, verificabilidad, relevancia electoral, disponibilidad de fuentes y, cuando existe, una razón breve de verificabilidad.
- Una aseveración excluida requiere uno de: `opinión`, `predicción`, `retórica` o `ambigüedad`.
- Las propuestas de GLM, Gemma y Nemotron reciben el mismo objeto de aseveración, evidencia y esquema `proposal.v1`; su única salida es un foco de revisión no vinculante.
- La evidencia se obtiene mediante `AiSearchProvider`; ausencia o metadatos incompletos conservan `Evidencia insuficiente`.
- El límite de tres aseveraciones es una restricción deliberada del prototipo; si un modelo devuelve más, el motor trunca la salida y registra una degradación honesta.

## Resiliencia y trazabilidad

- El presupuesto total predeterminado es 90.000 ms y se propaga como `AbortSignal`; la extracción tiene además un tramo propio de 35.000 ms que también limita a su respaldo.
- Cada respuesta inválida recibe exactamente un intento de reparación; una segunda respuesta inválida queda como fallo estructurado.
- Errores de cuota, indisponibilidad y tiempo agotado se conservan como limitaciones en español y eventos de traza redactados.
- Se produce una síntesis solo si existen al menos dos propuestas válidas que compartan el mismo foco de revisión. No representa un veredicto editorial.
