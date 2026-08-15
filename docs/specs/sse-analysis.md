# Spec: Análisis progresivo por SSE

## Alcance

`POST /api/analyses` acepta exactamente una de `{ "text": string }` (20 a 20.000 caracteres) o `{ "url": string }` (HTTP/HTTPS). Las URL se recuperan y convierten en texto legible antes de iniciar el mismo motor. Devuelve un flujo `text/event-stream` con `Content-Encoding: identity`. Los errores de entrada son respuestas JSON en español con estado `400`.

## Contrato de eventos

Los nombres permitidos son `analysis.started`, `claim.extracted`, `evidence.retrieved`, `model.completed`, `model.failed`, `consensus.completed` y `analysis.completed`. Cada evento contiene en `data` `pipelineVersion`, `promptVersion`, `durationMs`, `usage`, `retries` y `degradations`. `analysis.started` puede incluir `inputType` y `sourceUrl`. `claim.extracted` conserva el campo aditivo `rationale` por aseveración, junto con su proveedor y modelo efectivos. Los eventos que representan resultados también incluyen un `traceEventId` cuando existe.

El primer evento es `analysis.started` y se escribe antes de invocar el motor. `analysis.completed` siempre termina un análisis no cancelado con estado `completed`, `partial` o `failed`; las limitaciones se conservan en `degradations` y `limitations`. El motor nunca usa `completed` si todas las aseveraciones fueron excluidas o si no quedó evidencia oficial relevante.

## Cancelación

La desconexión del flujo activa un `AbortController` que se propaga al motor y a las invocaciones de modelos. El servidor no intenta escribir un evento terminal después de una cancelación.

## Interfaz editorial

La interfaz muestra el texto, el avance por aseveraciones, evidencia, propuestas y comparación, además de proveedor/modelo, uso, trazas y las limitaciones terminales en español. Si un evento terminal inconsistente marca `completed` sin evidencia o solo con aseveraciones excluidas, el cliente lo presenta de forma segura como `parcial`. Las propuestas y el acuerdo de consenso son insumos no vinculantes. El servidor y el cliente no generan ni preseleccionan una categoría `Cierto`, `Falso` u otra decisión editorial.
