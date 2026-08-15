# Ficha de Gobernanza Ética del MVP

**Proyecto:** informa-t, MediaHack II  
**Estado:** MVP experimental para apoyo a periodistas y equipos de verificación  
**Fecha de registro:** `[AAAA-MM-DD]`

Esta ficha separa lo implementado hoy de lo que permanece fuera de alcance. La evidencia técnica se cita inline con rutas del repositorio. La ficha no constituye un dictamen jurídico ni reemplaza la decisión editorial humana.

## Datos generales

| Campo | Declaración |
|---|---|
| Nombre del proyecto | informa-t |
| Equipo | `[Nombre del equipo]` |
| Integrantes y perfiles | `[Nombre de integrante — perfil o rol]` |
| Persona responsable | `[Nombre de la persona responsable]` |
| Contacto | `[Correo de contacto]` |
| Versión evaluada | MVP experimental |
| Modalidad | Asistencia editorial para analizar texto o una URL pública, contrastar aseveraciones con evidencia primaria y documentar una decisión humana. |

**Evidencia:** `docs/specs/mediahack-prd-draft.md`, `docs/specs/sse-analysis.md`.

## S1. Supervisión humana (HITL)

### Control implementado

La inteligencia artificial funciona como apoyo técnico: extrae hasta tres aseveraciones, recupera evidencia y muestra propuestas estructuradas. La extracción no puede emitir un veredicto editorial; las propuestas y la síntesis de consenso se presentan como insumos no vinculantes. El consenso de propuestas no equivale a la decisión de la redacción.

La persona periodista interviene después de la presentación de evidencia, propuestas y trazas. En el panel de decisión debe ingresar un autor, escoger explícitamente una de las seis categorías permitidas y escribir una justificación. La exportación permanece deshabilitada hasta que las tres condiciones sean válidas. Cambiar o retirar la categoría también genera un evento editorial local.

Solo después de esa decisión humana se habilitan dos descargas separadas:

- `ClaimReview` JSON-LD, construido únicamente con los campos de decisión humana y las aseveraciones.
- Traza editorial JSON, con el estado final y los eventos `selected`, `changed` y `withdrawn`.

El MVP no ofrece publicación automática ni una alerta pública generada por el modelo. La salida de análisis es un flujo SSE; la decisión y sus exportaciones ocurren en el cliente y requieren acción humana explícita. Tampoco se expone cadena de pensamiento: las explicaciones visibles son razones estructuradas, evidencia, incertidumbre, limitaciones y procedencia.

**Evidencia:** `src/client/App.tsx`, `src/client/components/EditorialDecision.tsx`, `src/shared/claim-review.ts`, `src/client/export.ts`, `docs/specs/editorial-decision.md`, `docs/specs/editorial-panel.md`, `tests/editorial-decision.test.tsx`, `tests/claim-review.test.ts`.

## S2. Transparencia y origen de datos

### Cómo funciona, en lenguaje claro

1. La API acepta exactamente texto o URL. Para una URL, el Worker obtiene texto legible antes de iniciar el mismo motor de análisis.
2. La etapa de extracción solicita fragmentos literales y hasta tres aseveraciones atómicas. El servidor deriva campos locales cuando encuentra el fragmento exacto; el modelo no puede enviar campos derivados arbitrarios.
3. Cada aseveración consulta el índice oficial de Cloudflare AI Search. La respuesta válida conserva institución, colección, título, versión, URL, fecha, ubicación de cita, licencia, cobertura, fragmento textual y hash del artefacto. La falta de evidencia o de metadatos produce `Evidencia insuficiente`, no una conclusión de falsedad.
4. Tres propuestas reciben el mismo objeto de aseveración y evidencia. Cada una comunica foco de revisión, justificación factual, incertidumbre y limitaciones. La síntesis solo resume propuestas válidas; no decide por la persona editora.
5. El análisis se transmite como eventos SSE con etapa, duración, reintentos, degradaciones, trazas y procedencia efectiva de proveedor y modelo.

### Citas y trazabilidad primaria

La interfaz presenta enlaces a fuentes primarias y fragmentos textuales con ubicación de cita. La procedencia no se completa con datos inventados: los metadatos incompletos descartan el fragmento. Los eventos de traza se redactan, se canonicalizan y reciben un hash SHA-256. El sistema muestra proveedor y modelo efectivos por resultado de extracción y propuesta, sin mostrar secretos ni cadena de pensamiento.

Esto permite una revisión reproducible desde la cita, el documento oficial, la ubicación indicada y la traza. El repositorio no declara un SLA medido de verificabilidad en menos de 30 segundos; esa condición debe validarse en una evaluación editorial independiente.

### Documentación y apertura

La implementación se acompaña de especificaciones, contratos, pruebas y un índice documental para facilitar auditoría cívica. Esta ficha declara el uso de componentes de terceros en una sección separada. No se atribuye aquí una licencia MIT, GPL o CC que no esté verificada en el repositorio; la licencia de publicación debe definirse antes de una entrega abierta.

**Evidencia:** `src/server/routes/analyses.ts`, `src/server/prompts/text-analysis.ts`, `src/server/pipeline/analyze-text.ts`, `src/server/providers/ai-search.ts`, `docs/specs/ai-search-provider.md`, `docs/specs/text-analysis-engine.md`, `docs/specs/sse-analysis.md`, `src/shared/trace.ts`, `tests/trace.test.ts`, `tests/analysis-sse.test.ts`.

## S3. Neutralidad política

### Salvaguardas implementadas

- El mismo contrato de extracción y el mismo esquema de propuesta se aplican a cada aseveración; las tres propuestas reciben el objeto de aseveración y la evidencia recuperada para ese objeto.
- El prompt exige un encuadre factual breve, evidencia a favor o en contra, incertidumbre y limitaciones. Prohíbe afirmar verdad o falsedad y prohíbe convertir una propuesta en veredicto.
- Las exclusiones se limitan a opinión, predicción, retórica o ambigüedad. El flujo no presenta la motivación subjetiva de una persona como un hecho probado.
- El corpus y la búsqueda se orientan a documentos primarios institucionales con metadatos de cobertura. La evidencia ausente no se convierte en `Falso`, `Engañoso` ni en otra categoría.
- La categoría editorial no la selecciona el código de análisis: la selecciona la persona periodista en el panel HITL.

Estas salvaguardas reducen automatismos asimétricos, pero no constituyen una medición estadística de sesgo ni una garantía de neutralidad sustantiva frente a cualquier corpus o cobertura. La revisión humana debe comprobar que se use el mismo criterio para actores, partidos, movimientos y posiciones políticas.

**Evidencia:** `src/server/prompts/text-analysis.ts`, `src/server/pipeline/analyze-text.ts`, `src/server/providers/ai-search.ts`, `docs/specs/ai-search-provider.md`, `docs/specs/editorial-decision.md`, `tests/consensus.test.ts`.

## S4. Protección de datos personales (LOPDP)

### Inventario y flujo real

- El MVP no implementa cuentas de usuario ni una base de datos editorial. El análisis se procesa durante la solicitud SSE; `wrangler.jsonc` solo declara los bindings `AI`, `AI_SEARCH` y `ASSETS`, sin D1, KV, R2 ni Durable Objects.
- La entrada puede ser texto pegado o una URL pública. El texto pegado y el texto obtenido desde una URL se procesan en memoria durante el análisis y se envían a proveedores de modelos de terceros para la extracción o las propuestas cuando la ruta de análisis los invoca. Esto incluye, para la extracción, OpenRouter con `openai/gpt-5.6-luna` como modelo principal cuando está configurado y Cloudflare Workers AI como respaldo de esa etapa; las propuestas se generan con modelos de Cloudflare Workers AI.
- El campo de autor y la justificación editorial pueden contener datos personales del periodista. Se mantienen en estado del navegador y solo se incluyen en las descargas iniciadas por la persona; no se envían a un endpoint de decisión ni se guardan en una tabla del servidor.
- El MVP no solicita ni crea perfiles políticos ciudadanos, no conserva un historial de navegación y no está diseñado para recolectar datos sensibles. Como cualquier herramienta que recibe texto libre, una persona usuaria no debe pegar datos personales innecesarios o sensibles.

### Controles técnicos

- La recuperación de URL acepta solo HTTP/HTTPS sin credenciales, valida el destino y cada redirección, bloquea localhost, metadatos, IP privadas, loopback, link-local, multicast y rangos reservados, y aplica límites de tamaño y tiempo.
- La clave de OpenRouter se toma del entorno o secreto del runtime. Las trazas eliminan claves, autorizaciones, cookies, encabezados y campos de cadena de pensamiento.
- Los documentos del corpus incorporan límites de cobertura, ubicación de cita, licencia y hash; el corpus de prueba prohíbe secretos y datos ciudadanos identificables.

### Declaración LOPDP

La postura del MVP es de minimización, procesamiento temporal y control humano, no una certificación jurídica completa de cumplimiento de la LOPDP. En particular, el envío en vuelo a proveedores terceros debe informarse y evaluarse contractualmente antes de un uso productivo. No se afirma consentimiento legal, transferencia internacional autorizada ni retención cero fuera de los límites que el repositorio implementa y documenta.

**Evidencia:** `wrangler.jsonc`, `src/server/routes/analyses.ts`, `src/server/providers/openrouter.ts`, `src/server/providers/workers-ai.ts`, `docs/specs/model-fallback.md`, `docs/specs/sse-analysis.md`, `docs/specs/editorial-decision.md`, `src/server/article-fetch.ts`, `docs/specs/url-analysis.md`, `src/shared/trace.ts`, `docs/specs/corpus.md`, `tests/url-analysis.test.ts`, `tests/trace.test.ts`, `tests/corpus.test.ts`.

## S5. Gestión y mitigación de riesgos

| Riesgo real del prototipo | Consecuencia posible | Mitigación implementada y señal visible | Evidencia |
|---|---|---|---|
| Variación de latencia o extracción bloqueada | Resultado parcial o análisis fallido; no se obtienen todas las aseveraciones. | Presupuesto total de 90 segundos, techo de extracción de 45 segundos, intentos de 20 segundos y un reintento; el resultado conserva limitaciones en español. | `src/server/pipeline/analyze-text.ts`, `src/server/providers/workers-ai.ts`, `docs/specs/model-fallback.md`, `tests/text-analysis-engine.test.ts`, `tests/analysis-sse.test.ts` |
| Indisponibilidad, cuota, timeout o respuesta inválida del modelo | Falta una propuesta o baja la calidad de la extracción. | Respaldo entre OpenRouter y Workers AI según la etapa, un único intento de reparación JSON, procedencia efectiva y mensaje honesto como `No se generó una propuesta`. | `src/server/providers/workers-ai.ts`, `src/server/providers/openrouter.ts`, `docs/specs/model-fallback.md`, `tests/model-fallback.test.ts` |
| Error o alucinación en una propuesta | Una persona podría sobrevalorar una explicación incorrecta. | Prompt no vinculante, evidencia identificable, incertidumbre, limitaciones, comparación de tres propuestas y decisión editorial separada. | `src/server/prompts/text-analysis.ts`, `src/server/pipeline/analyze-text.ts`, `docs/specs/text-analysis-engine.md`, `docs/specs/editorial-decision.md` |
| Límite deliberado de tres aseveraciones | El texto puede contener más claims y quedar incompleto. | Se conservan solo las primeras tres y se registra una degradación explícita en español. | `src/server/prompts/text-analysis.ts`, `src/server/pipeline/analyze-text.ts`, `tests/url-analysis.test.ts` |
| Cobertura limitada del corpus y demoras o ausencia en AI Search | La evidencia puede ser insuficiente; no permite concluir falsedad. | AI Search devuelve `Evidencia insuficiente`, conserva la limitación y muestra la cobertura del artefacto. El corpus versionado contiene actualmente ítems públicos INEC ENEMDU. | `src/server/providers/ai-search.ts`, `docs/specs/ai-search-provider.md`, `docs/specs/corpus.md`, `corpus/items/inec-pobreza-2025-06/metadata.json`, `corpus/items/inec-pobreza-historica-series/metadata.json` |
| URL maliciosa o respuesta excesiva | SSRF, acceso a red privada o consumo descontrolado de recursos. | Validación DNS/destino y redirecciones, bloqueo de redes privadas, solo HTML/texto, límite de 1 MB y expiración de 8 segundos. | `src/server/article-fetch.ts`, `docs/specs/url-analysis.md`, `tests/url-analysis.test.ts` |

Las degradaciones no se silencian: aparecen en eventos SSE, limitaciones del resultado o trazas redactadas. La traza contiene proveedor, modelo, etapa y hash canónico, pero no pretende demostrar que una propuesta sea verdadera.

**Evidencia:** `src/server/routes/analyses.ts`, `src/shared/trace.ts`, `docs/specs/sse-analysis.md`, `docs/specs/model-fallback.md`, `tests/analysis-sse.test.ts`, `tests/trace.test.ts`.

## S6. Control de usos no permitidos

### Declaración de alcance

En la versión evaluada no se implementan módulos para:

- vigilancia, seguimiento o rastreo de personas;
- perfilamiento político de ciudadanía;
- manipulación de audiencias;
- favorecer o perjudicar deliberadamente a candidaturas, partidos, movimientos o posiciones;
- amplificación artificial de desinformación.

El análisis recibe texto o una URL pública, extrae aseveraciones, busca evidencia y muestra propuestas para revisión. No existe una ruta de publicación autónoma ni un mecanismo de segmentación o mensajería de audiencias. Si durante la evaluación se detectara un uso de esta clase, debe retirarse antes de presentar el MVP.

### Lista de verificación para firma

| Control | Estado declarado |
|---|---|
| No vigilancia o tracking de personas | No implementado |
| No perfilamiento político ciudadano | No implementado |
| No manipulación de audiencias | No implementado |
| No favorecimiento o daño deliberado a actores políticos | No implementado |
| No amplificación artificial de desinformación | No implementado |
| Revisión y firma de la persona responsable | `[Pendiente: Nombre, cargo, fecha y firma]` |

**Evidencia:** `src/server/routes/analyses.ts`, `src/client/App.tsx`, `docs/specs/mediahack-prd-draft.md`, `docs/specs/editorial-panel.md`, `docs/specs/editorial-decision.md`.

## Declaración de componentes de terceros

| Componente | Uso declarado | Tratamiento y límite |
|---|---|---|
| Cloudflare Workers AI: GLM (`@cf/zai-org/glm-4.7-flash`), Gemma (`@cf/google/gemma-4-26b-a4b-it`) y Nemotron (`@cf/nvidia/nemotron-3-120b-a12b`) | Propuestas multimodelo; GLM también participa como respaldo de extracción cuando corresponde. | Propuestas no vinculantes; se registra proveedor y modelo efectivos. |
| OpenRouter, modelo `openai/gpt-5.6-luna` | Extracción supervisora cuando `OPENROUTER_API_KEY` está configurada; Workers AI es el respaldo de esa etapa. | El texto de entrada de extracción se envía al endpoint tercero en vuelo; la clave no se registra ni se persiste en trazas. |
| Cloudflare AI Search, instancia `informa-t-oficial` | Recuperación de fragmentos de fuentes primarias curadas. | El resultado exige metadatos de procedencia y puede degradar a `Evidencia insuficiente`. |
| Datos públicos INEC ENEMDU | Corpus curado de evidencia oficial, con artefacto, URL, ubicación, cobertura, licencia y hash. | La cobertura actual no equivale a cobertura de todas las fuentes electorales. |
| React, Hono y Vite | Stack de interfaz, API y empaquetado del proyecto. | Declarados como dependencias del proyecto; no se atribuye en esta ficha una licencia específica no verificada. |

**Evidencia:** `wrangler.jsonc`, `src/server/config/models.ts`, `src/server/providers/openrouter.ts`, `src/server/providers/workers-ai.ts`, `src/server/providers/ai-search.ts`, `docs/specs/model-fallback.md`, `docs/specs/ai-search-provider.md`, `corpus/items/inec-pobreza-2025-06/metadata.json`, `corpus/items/inec-pobreza-historica-series/metadata.json`, `package.json`.

## No implementado / Roadmap

Los siguientes puntos no forman parte de la funcionalidad implementada en la versión evaluada y no deben presentarse como disponibles:

- **Descripción de imágenes:** el flujo actual de análisis procesa texto/HTML legible; no existe un módulo implementado de descripción de imágenes.
- **Transcripción de audio:** no existe un flujo implementado de transcripción de audio en la recuperación actual.
- **Corpus de planes de gobierno del CNE:** el corpus versionado disponible para esta ficha contiene ítems INEC ENEMDU; no se declara cobertura CNE.
- **Caché y reanálisis:** el runtime actual no declara KV ni otro binding de persistencia; el análisis en vivo es SSE y no se presenta reutilización de resultados.
- **Evaluación ciega:** no se declara un protocolo ni una métrica de evaluación ciega implementada.
- **Consulta cruzada con Google Fact Check Explorer:** no existe integración implementada; la recuperación disponible es el índice oficial AI Search del proyecto.

**Evidencia:** `wrangler.jsonc`, `src/server/article-fetch.ts`, `docs/specs/url-analysis.md`, `docs/specs/text-analysis-engine.md`, `docs/specs/sse-analysis.md`, `src/server/providers/ai-search.ts`, `corpus/items/inec-pobreza-2025-06/metadata.json`, `corpus/items/inec-pobreza-historica-series/metadata.json`.

## Declaración final

`informa-t` se presenta como una herramienta experimental de apoyo a la verificación, no como autoridad editorial. Sus modelos proponen y trazan; una persona periodista contrasta fuentes, evalúa limitaciones, decide y exporta. La evaluación debe considerar las degradaciones, la cobertura curada y todos los límites declarados en esta ficha.
