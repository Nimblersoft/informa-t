# Spec: Respaldo de modelos Luna y Workers AI

## Alcance

La extracción usa OpenRouter con `openai/gpt-5.6-luna` como proveedor supervisor para `claim-extraction.v3`. El modelo devuelve únicamente el fragmento literal, un encuadre supervisor breve y la decisión de exclusión. Si Luna falla por indisponibilidad, cuota, tiempo agotado o JSON inválido después de una reparación, intenta la extracción actual de Workers AI como respaldo y conserva una degradación visible. Las propuestas `proposal.v1` mantienen Workers AI como primario y su respaldo OpenRouter equivalente.

## Configuración y secretos

- `src/server/config/models.ts` contiene el mapa de equivalencias entre IDs de Workers AI y slugs de OpenRouter.
- `OPENROUTER_API_KEY` se obtiene exclusivamente del entorno o binding de secreto inyectado por el runtime. Nunca se registra, persiste ni incluye en trazas.
- Sin clave configurada, el motor conserva el comportamiento Workers-AI-only y agrega una limitación visible en español; no lanza un error de configuración al usuario.

## Cliente y presupuesto

`OpenRouterClient` usa `fetch` contra `/api/v1/chat/completions`, envía los mensajes de extracción y `response_format: { type: "json_object" }`. Cada intento de extracción tiene 20.000 ms y puede repetirse exactamente una vez cuando se agota el tiempo; la etapa completa tiene un techo de 45.000 ms, independiente y menor que el presupuesto total predeterminado de 90.000 ms. Estos límites aplican tanto a Luna como a Workers AI y evitan que una invocación colgada consuma todo el análisis. La entrada de extracción se limita a 8.000 caracteres; si se recorta, se registra una limitación visible en español.

Cada proveedor conserva exactamente un intento de reparación para una respuesta JSON inválida. En extracción, una respuesta inválida después de la reparación activa Workers AI; en propuestas se conserva la regla existente y no se fabrica una propuesta.

## Proveniencia y degradación

Cada resultado de extracción/aseveración y cada propuesta incluye proveedor efectivo e ID de modelo efectivo. Las trazas registran proveedor, modelo y códigos de error redactados; no contienen claves, cabeceras ni cuerpos HTTP.

El consenso sigue requiriendo al menos dos propuestas válidas con el mismo foco. Ningún camino de respaldo produce un veredicto editorial autónomo.
