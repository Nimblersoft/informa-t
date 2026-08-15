# Spec: Análisis de artículos por URL

## Entrada

`POST /api/analyses` acepta exactamente `{ "url": string }` además de la entrada de texto existente. Solo se permiten URL `http` y `https`, sin credenciales, con un máximo de 2.048 caracteres. Payloads vacíos, ambiguos o con esquema no permitido reciben `400` y un mensaje en español.

## Recuperación segura

El Worker valida cada destino antes de recuperarlo y también valida los destinos de redirección observados durante la prevalidación. Rechaza localhost, metadatos, dominios locales, IP privadas, loopback, link-local, multicast y rangos reservados. La respuesta debe ser HTML o texto, no puede superar 1 MB y la recuperación expira en 8 segundos. El cuerpo se lee por fragmentos para no aceptar respuestas ilimitadas. Un destino seguro que rechaza la recuperación directa puede pasar al binding `BROWSER` de Cloudflare Browser Run mediante `quickAction("content", ...)`; `remote: true` permite esa acción durante el desarrollo local. El binding no sustituye la validación SSRF ni los límites de tamaño.

## Texto legible y degradación

El extractor personalizado conserva el contenido de `article` o `main` cuando existe, elimina scripts, estilos, navegación, formularios y bloques de plantilla, decodifica entidades y normaliza espacios. Browser Run permite extraer HTML después de renderizar páginas dinámicas o protegidas contra solicitudes directas. Si la recuperación o extracción falla, el flujo termina con `analysis.completed` fallido y una limitación honesta; `degradations` incluye una categoría segura `url-extraction:*` para diagnóstico. Nunca inventa aseveraciones ni un veredicto. Las categorías no incluyen mensajes ni contenido devuelto por la fuente.

## Flujo editorial

El texto recuperado entra al mismo SSE y motor que el texto pegado. La entrada enviada a extracción se limita a 8.000 caracteres; si el artículo supera ese límite, el análisis conserva una limitación visible: `El artículo fue truncado para el análisis del prototipo.` La extracción `claim-extraction.v3` solo solicita fragmento literal, encuadre supervisor breve y exclusión; el servidor deriva normalización y ubicación cuando encuentra el fragmento exacto. `analysis.started` identifica `inputType: "url"` y conserva `sourceUrl`; las aseveraciones, razones, evidencia, propuestas y trazas siguen sujetas a revisión humana.
