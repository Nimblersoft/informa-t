# Spec: Respaldo de modelos Workers AI a OpenRouter

## Alcance

El motor usa Workers AI como proveedor primario para extracción `claim-extraction.v1` y propuestas `proposal.v1`. Si una invocación falla por indisponibilidad, cuota o tiempo agotado, intenta una sola vez la misma solicitud lógica mediante OpenRouter, usando el modelo equivalente configurado.

## Configuración y secretos

- `src/server/config/models.ts` contiene el mapa de equivalencias entre IDs de Workers AI y slugs de OpenRouter.
- `OPENROUTER_API_KEY` se obtiene exclusivamente del entorno o binding de secreto inyectado por el runtime. Nunca se registra, persiste ni incluye en trazas.
- Sin clave configurada, el motor conserva el comportamiento Workers-AI-only y agrega una limitación visible en español; no lanza un error de configuración al usuario.

## Cliente y presupuesto

`OpenRouterClient` usa `fetch` contra `/api/v1/chat/completions`, envía el modelo equivalente, los mensajes originales y `response_format: { type: "json_object" }`. El `AbortSignal` compartido por el pipeline gobierna ambos proveedores dentro del presupuesto total predeterminado de 90.000 ms.

Cada proveedor conserva exactamente un intento de reparación para una respuesta JSON inválida. Una respuesta inválida después de la reparación no activa un segundo proveedor ni fabrica una propuesta.

## Proveniencia y degradación

Cada resultado de extracción/aseveración y cada propuesta incluye proveedor efectivo e ID de modelo efectivo. Las trazas registran proveedor, modelo y códigos de error redactados; no contienen claves, cabeceras ni cuerpos HTTP.

El consenso sigue requiriendo al menos dos propuestas válidas con el mismo foco. Ningún camino de respaldo produce un veredicto editorial autónomo.
