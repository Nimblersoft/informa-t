# Spec: Análisis progresivo por SSE

## Alcance

`POST /api/analyses` acepta `{ "text": string }` de 20 a 20.000 caracteres y devuelve un flujo `text/event-stream` con `Content-Encoding: identity`. Los errores de entrada son respuestas JSON en español con estado `400`.

## Contrato de eventos

Los nombres permitidos son `analysis.started`, `claim.extracted`, `evidence.retrieved`, `model.completed`, `model.failed`, `consensus.completed` y `analysis.completed`. Cada evento contiene en `data` `pipelineVersion`, `promptVersion`, `durationMs`, `usage`, `retries` y `degradations`. Los eventos que representan resultados también incluyen un `traceEventId` cuando existe.

El primer evento es `analysis.started` y se escribe antes de invocar el motor. `analysis.completed` siempre termina un análisis no cancelado con estado `completed`, `partial` o `failed`; las limitaciones se conservan en `degradations` y `limitations`.

## Cancelación

La desconexión del flujo activa un `AbortController` que se propaga al motor y a las invocaciones de modelos. El servidor no intenta escribir un evento terminal después de una cancelación.

## Interfaz editorial

La interfaz muestra el texto, el avance por aseveraciones, evidencia, propuestas y comparación, además de proveedor/modelo, uso y trazas. Las propuestas y el acuerdo de consenso son insumos no vinculantes. El servidor y el cliente no generan ni preseleccionan una categoría `Cierto`, `Falso` u otra decisión editorial.
