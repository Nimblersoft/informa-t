# Spec: Motor de análisis de texto

## Alcance

El motor local recibe texto de 20 a 20.000 caracteres, limita la entrada enviada a extracción a 8.000 caracteres y registra una degradación en español si la recorta. Extrae hasta tres aseveraciones bajo `claim-extraction.v4`, recupera evidencia oficial con el proveedor AI Search inyectado y solicita en paralelo tres propuestas no vinculantes bajo `proposal.v1`. La extracción usa `openai/gpt-5.6-luna` mediante OpenRouter cuando está disponible; el modelo solo devuelve `verbatim`, `rationale` y `decision`. No expone interfaz, no usa KV, secretos ni emite decisiones editoriales.

## Contratos

- Cada aseveración conserva texto literal, texto normalizado derivado localmente, ubicación de inicio y fin cuando el fragmento aparece literalmente, fechas, verificabilidad, relevancia electoral, disponibilidad de fuentes y una razón breve de encuadre. Las entidades son opcionales y se omiten si no existe un extractor local seguro. Las aseveraciones que no aparecen literalmente en el texto fuente se descartan antes de mostrarse.
- `decision` puede ser `lista_para_contraste`, `ambigüedad`, `opinión`, `predicción` o `retórica`. Solo las tres últimas producen exclusión dura. `ambigüedad` continúa con evidencia y propuestas, pero deriva `verifiable: false`, `pipelineDisposition: "continuar_con_contexto"` y una limitación visible que solicita precisar período, geografía o base.
- Las propuestas de GLM, Gemma y Nemotron reciben el mismo objeto de aseveración, evidencia y esquema `proposal.v1`; su única salida es un foco de revisión no vinculante.
- La evidencia se obtiene mediante `AiSearchProvider`; ausencia o metadatos incompletos conservan `Evidencia insuficiente`.
- Una aseveración sin evidencia oficial relevante no genera propuestas y conserva `sourceAvailability: "insuficiente"`; el resultado no puede ser `completed`.
- Si todas las aseveraciones están excluidas o no queda ninguna aseveración literal utilizable, el resultado es `partial` con una limitación visible en español.
- El límite de tres aseveraciones es una restricción deliberada del prototipo; si un modelo devuelve más, el motor trunca la salida y registra una degradación honesta.

## Resiliencia y trazabilidad

- El presupuesto total predeterminado es 90.000 ms y se propaga como `AbortSignal`; la extracción tiene un techo de etapa de 45.000 ms, con intentos individuales de 20.000 ms y exactamente un reintento de extracción por tiempo agotado. Cada intento de propuesta, tanto primario como de respaldo, tiene un techo independiente de 20.000 ms para que una inferencia lenta no bloquee los demás resultados.
- Cada respuesta inválida recibe exactamente un intento de reparación; una segunda respuesta inválida queda como fallo estructurado.
- Errores de cuota, indisponibilidad y tiempo agotado se conservan como limitaciones en español y eventos de traza redactados.
- Se produce una síntesis solo si existen al menos dos propuestas válidas que compartan el mismo foco de revisión. No representa un veredicto editorial.
