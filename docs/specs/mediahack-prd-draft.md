---
titulo: "Especificación: MVP de informa-t para MediaHack II"
tipo: especificacion
estado: activa
cubre: "src/**, corpus/**, scripts/seed-ai-search.ts, tests/**"
fuentes:
  - "https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40"
  - "docs/research/corpus-oficial-y-casos-demo.md"
  - "docs/adr/0002-explicabilidad-mediante-trazas-estructuradas.md"
ultima_revision: 2026-08-15
---

# Spec: MVP de informa-t para MediaHack II

## 1. Objetivo y resultado esperado

informa-t será un asistente editorial en español latinoamericano para que una persona periodista investigue hasta tres aseveraciones verificables de un texto o una URL pública, contraste cada una con fuentes primarias curadas, compare propuestas estructuradas de tres modelos y documente su propia decisión editorial.

El MVP debe producir un flujo demostrable en menos de cinco minutos: **entrada → extracción → evidencia oficial → propuestas y desacuerdos → trazabilidad → decisión humana → exportación ClaimReview**. Ningún modelo puede seleccionar, publicar o exportar por sí mismo un veredicto editorial.

### 1.1. No objetivos

- Publicación autónoma de verificaciones.
- Perfilamiento político de ciudadanos.
- Scraping masivo, evasión de CAPTCHA, login o controles anti-bot.
- Detección forense de deepfakes, voz sintética, alteración de píxeles o coordinación de bots.
- Video, PDF cargado por el usuario, extensión de navegador o bot de mensajería.
- Garantizar extracción desde cualquier red social o sitio dinámico.
- Presentar índices heurísticos como porcentajes estadísticos o la intención comunicativa como un hecho probado.
- Exponer chain-of-thought, tokens privados de pensamiento, secretos o credenciales.

## 2. Usuarios y principios de producto

### 2.1. Usuario primario

Periodistas, equipos de verificación y salas de redacción que investigan información electoral ecuatoriana. La ciudadanía consume únicamente las verificaciones que dichos equipos decidan publicar fuera del MVP.

### 2.2. Principios obligatorios

1. **Control editorial humano:** el selector de veredicto inicia vacío y requiere una acción humana explícita.
2. **Evidencia reproducible:** una cita apunta al artefacto, página, fila o segmento exacto que la sustenta.
3. **Separación epistemológica:** evidencia primaria, contexto periodístico y propuestas de modelos aparecen en secciones distintas.
4. **Neutralidad:** se aplica el mismo contrato, rúbrica y corpus a todos los actores políticos.
5. **Explicabilidad verificable:** todo resultado visible enlaza a una traza estructurada, sin afirmar acceso a razonamiento privado.
6. **Degradación honesta:** falta de datos, errores y desacuerdos se muestran; nunca se convierten silenciosamente en certeza.
7. **Privacidad por minimización:** no se almacena identidad ni información personal innecesaria de quien consulta.

## 3. Alcance técnico decidido

El MVP será una aplicación TypeScript de origen único desplegable en Cloudflare Workers:

- **Interfaz:** React + Vite, basada en el flujo vertical de extractos del prototipo.
- **API:** Hono dentro del mismo Worker.
- **Activos estáticos:** Workers Static Assets, con rutas `/api/*` dirigidas primero al Worker.
- **Evidencia oficial:** Cloudflare AI Search con almacenamiento integrado y búsqueda híbrida sobre un corpus curado.
- **Inferencia en vivo:** Workers AI mediante binding, sin claves externas.
- **Extracción URL:** Browser Run Quick Actions mediante binding remoto.
- **Audio:** `@cf/openai/whisper-large-v3-turbo`.
- **Visión:** `@cf/google/gemma-4-26b-a4b-it`.
- **Caché:** Workers KV, TTL de 24 horas y omisión explícita mediante `Volver a analizar`.
- **Persistencia editorial:** estado del navegador y descarga JSON/ClaimReview; no se necesita D1 para el prototipo.
- **Pruebas:** Vitest con el pool de Workers y Playwright para aceptación visual.

No se añadirán D1, R2, Queues, Workflows, Durable Objects, ORM, Tailwind ni un SDK de agentes mientras este contrato no los requiera.

### 3.1. Modalidades de análisis

| Modalidad | Uso | Proveedores | Presentación obligatoria |
|---|---|---|---|
| `capturado` | Casos conocidos de la demostración | Respuestas generadas manualmente con `agy` o Kilo y almacenadas como fixtures | Distintivo `Análisis capturado para demostración`, fecha, herramienta, modelo declarado y hash de entrada |
| `en_vivo` | Texto o URL introducido durante el demo | Workers AI | Modelo real, tiempos, errores y consumo reportado |

Las suscripciones personales y sus tokens OAuth no forman parte de la aplicación, no se almacenan en Infisical y no se invocan desde solicitudes del producto. Una futura incubación podrá añadir un proveedor Cloudflare AI Gateway detrás del mismo contrato de propuesta y traza.

## 4. Flujo de experiencia

1. La persona elige un caso de demostración, pega texto o introduce una URL pública.
2. El sistema valida la entrada y muestra progreso por etapas desde el primer evento.
3. El contenido se divide en extractos y se identifican como máximo tres claims atómicos verificables; opinión o retórica queda marcada como no verificable.
4. Al seleccionar un extracto, el panel derecho muestra pestañas **Evidencia**, **Modelos** y **Logs**.
5. Evidencia presenta citas primarias; contexto relacionado aparece separado y nunca participa automáticamente en la decisión.
6. Modelos compara tres propuestas, sus citas, justificaciones estructuradas, índices y desacuerdos.
7. Logs permite reconstruir todo el procesamiento y descargar la traza JSON.
8. La persona periodista elige uno de seis veredictos y escribe una justificación.
9. Solo entonces se habilita la exportación ClaimReview.

La interfaz debe conservar la arquitectura de dos paneles del prototipo: stream cronológico de extractos a la izquierda y análisis reactivo del extracto activo a la derecha. En pantallas estrechas, los paneles se apilan sin perder orden, navegación por teclado ni etiquetas accesibles.

## 5. Contratos funcionales

### F-01. Entrada y validación

Se aceptan exactamente dos formas de entrada:

- texto UTF-8 entre 20 y 20.000 caracteres;
- URL pública absoluta `http` o `https`, sin credenciales embebidas, localhost, IP privada ni esquema alternativo.

Una solicitud incluye `forceRefresh: false` por defecto. Errores de validación se muestran en español y no consumen inferencia.

### F-02. Extracción web y multimedia acotada

Para una URL, Browser Run recupera el contenido renderizado respetando los controles del sitio. El extractor conserva título, autor si existe, fecha publicada si existe, URL canónica, texto principal y advertencias.

Límites del MVP:

- imagen OpenGraph y hasta tres imágenes editoriales, máximo 5 MB por imagen;
- audio enlazado directamente mediante `<audio>` o `<source>`, máximo 25 MB;
- sin video, contenido autenticado, CAPTCHA ni garantía para redes sociales;
- timeout de extracción de 30 segundos;
- si la extracción falla, se solicita pegar el texto o proporcionar una URL directa al medio permitido.

La descripción de una imagen separa observaciones visibles de hipótesis contextuales. La transcripción de audio indica idioma detectado, texto y timestamps disponibles. Ninguna señal multimedia constituye análisis forense.

### F-03. Descomposición fáctica

El sistema produce entre una y tres aseveraciones atómicas cuando el contenido lo permite. Cada una incluye:

- texto exacto y versión normalizada;
- ubicación en el contenido original;
- entidades y fechas relevantes;
- resultado del filtro de verificabilidad, relevancia electoral y disponibilidad de fuentes;
- motivo cuando se excluye por ser opinión, predicción, retórica o demasiado ambigua.

En modo en vivo, esta etapa usa `@cf/zai-org/glm-4.7-flash` con salida JSON validada. En fixtures, conserva la herramienta y el modelo que generaron la descomposición.

### F-04. Recuperación de evidencia oficial

Cada claim consulta la instancia AI Search `informa-t-oficial` y recupera como máximo cinco fragmentos mediante búsqueda híbrida. Los filtros de metadata pueden acotar institución, colección, periodo y tipo de artefacto.

Cada fragmento conserva:

- institución y colección;
- identificador, título y versión del artefacto;
- URL original y fecha de recuperación;
- página, fila o segmento cuando aplique;
- cita textual;
- puntaje de recuperación;
- hash del archivo o contenido curado;
- cobertura y limitaciones conocidas.

La ausencia del atributo necesario produce `Evidencia insuficiente`; no se interpreta como falsedad. Las noticias y verificaciones previas son **contexto relacionado**, no evidencia primaria.

### F-05. Propuestas multimodelo

Cada claim en vivo se envía en paralelo, con idéntico contexto y esquema de salida, a:

1. `@cf/zai-org/glm-4.7-flash`;
2. `@cf/google/gemma-4-26b-a4b-it`;
3. `@cf/nvidia/nemotron-3-120b-a12b`.

Cada propuesta incluye categoría sugerida, citas utilizadas, evidencia favorable, evidencia contraria, justificación estructurada, incertidumbre, limitaciones y tres índices normalizados de 0 a 100:

- **Polarización discursiva:** intensidad de lenguaje que construye antagonismo entre grupos.
- **Carga emocional:** intensidad de urgencia, miedo, indignación u otras apelaciones emocionales.
- **Sustento en datos públicos:** cobertura y correspondencia de la afirmación con evidencia primaria disponible.

Los índices son señales heurísticas, no porcentajes medidos. La interfaz muestra nombre, escala, rúbrica y justificación de cada valor.

### F-06. Consenso y desacuerdo

- Una categoría tiene consenso cuando al menos dos de tres modelos coinciden; la UI muestra si fue 2/3 o 3/3. Tres categorías distintas producen `Sin consenso` y no existe desempate.
- Cada índice de modelo es un entero entre 0 y 100. Con tres valores válidos, el agregado es la mediana. Con dos valores válidos, es la media aritmética redondeada al entero más cercano.
- Existe acuerdo numérico cuando al menos dos valores válidos están a una distancia máxima de 15 puntos. Sin ese par, el agregado es `null` y la UI muestra los valores individuales.
- Si no se cumple la regla categórica o numérica correspondiente, el resultado se marca `Sin consenso` y se muestran las tres salidas.
- Un error de modelo no se sustituye por otra respuesta. Con menos de dos respuestas válidas no existe consenso.
- `Engañoso` requiere evidencia concreta de omisión o presentación materialmente tergiversada; una hipótesis de intención por sí sola no basta.

El consenso es una síntesis de propuestas, no un veredicto editorial.

### F-07. Logs y explicabilidad

La pestaña **Logs** presenta una línea de tiempo por análisis con:

1. identificador, esquema, timestamps, entrada normalizada y hash SHA-256 del JSON canónico UTF-8;
2. procedencia, extracción, segmentos y contenido omitido;
3. consulta, filtros, colecciones y fragmentos recuperados;
4. proveedor, modelo, prompt, modalidad, parámetros no sensibles, duración, uso, reintentos y errores;
5. salida estructurada completa de cada modelo;
6. cálculo reproducible del consenso y desacuerdo;
7. selección o retiro del veredicto por la persona periodista;
8. versión del pipeline, caché y degradaciones.

Todo dato visible enlaza al evento que lo produjo. La pestaña permite filtrar, expandir, comparar modelos, abrir fuentes y descargar la traza completa en JSON.

No se almacena ni muestra chain-of-thought. La explicación visible es una justificación estructurada: criterio, evidencia favorable y contraria, inferencia resumida, incertidumbre y limitaciones. Se eliminan secretos, tokens, encabezados de autenticación, instrucciones internas y datos personales innecesarios.

### F-08. Decisión editorial

El selector comienza sin valor y ofrece únicamente:

- Cierto;
- Falso;
- Impreciso;
- Engañoso;
- Sátira;
- Inverificable.

La selección y una justificación escrita son obligatorias para exportar. Cambiar o retirar la decisión genera un evento editorial local en la traza. Una señal de posible alteración multimedia se muestra por separado y no agrega un séptimo veredicto.

### F-09. ClaimReview

La exportación genera JSON-LD Schema.org `ClaimReview` por claim e incluye el texto revisado, autor editorial ingresado para la exportación, fecha, URL del contenido, veredicto humano y referencias a las fuentes primarias. Para múltiples claims utiliza `hasPart` desde el documento principal.

Las propuestas o el consenso de modelos nunca completan el campo editorial. La descarga incluye además la traza de análisis como JSON separado.

### F-10. Contexto relacionado

Los casos conocidos pueden incluir hasta cinco noticias relacionadas capturadas previamente, con título, medio, fecha, URL y fecha de captura. Se muestran en una sección visualmente separada y no se incluyen en el cálculo de consenso.

En el modo en vivo del prototipo, la búsqueda web relacionada se muestra como `No disponible en esta modalidad`. La incubación podrá habilitar búsqueda web mediante Cloudflare AI Gateway sin alterar el contrato de evidencia.

### F-11. Caché y reanálisis

El resultado ensamblado se guarda en KV durante 24 horas con una clave derivada de entrada canónica, versión de pipeline, versión de prompt y conjunto de modelos. La UI indica cuándo se reutilizó caché. `Volver a analizar` omite la lectura previa y escribe una nueva traza; nunca sobrescribe la evidencia de cómo se produjo el resultado mostrado.

### F-12. Protección del prototipo

- Turnstile protege el inicio de un análisis en vivo.
- El Worker aplica un límite de cinco análisis por IP por hora mediante el binding nativo Workers Rate Limiting.
- Los casos capturados no consumen el límite de inferencia.
- No existen cuentas de usuario en el MVP.
- La UI no expone identificadores de cuenta, bindings, secretos ni configuración interna.

## 6. Corpus y casos de evaluación

El corpus inicial se rige por `docs/research/corpus-oficial-y-casos-demo.md`. Los archivos curados viven en `corpus/items/` y un `corpus/manifest.json` registra institución, colección, artefacto, URL, fecha, versión, licencia, hash y cobertura.

El sembrado es idempotente: crea o actualiza `informa-t-oficial`, sube los archivos y espera que cada elemento quede indexado. Los secretos se leen del entorno; nunca se escriben en el repositorio.

Los cinco claims conocidos funcionan como evaluación posterior. Sus veredictos publicados no se incluyen en prompts ni evidencia de modelos. La evaluación registra coincidencia, desacuerdo y causa observada sin declarar que cinco ejemplos prueban exactitud general.

## 7. Contrato de errores y rendimiento

### 7.1. Degradación

- Un fallo de extracción permite continuar con texto pegado.
- Un fallo de una fuente deja visible el error y los demás fragmentos.
- Un fallo de un modelo conserva las otras propuestas, pero aplica las reglas de consenso de F-06.
- Un timeout produce resultado parcial descargable y no inventa datos faltantes.
- Un fallo de exportación no elimina la selección editorial ni la traza.

### 7.2. Objetivos de experiencia

- Primer evento de progreso: menos de 2 segundos.
- Caso capturado o caché: resultado interactivo en menos de 2 segundos.
- Texto en vivo: objetivo de resultado completo menor a 45 segundos.
- URL con multimedia: objetivo menor a 60 segundos y timeout total de 90 segundos.
- El usuario siempre ve la etapa activa y puede cancelar la solicitud en el navegador.

Los objetivos en vivo son metas de demo, no garantías de proveedor. Latencias reales permanecen visibles en Logs.

## 8. Criterios de aceptación del MVP

- [ ] Un caso capturado recorre el flujo completo con distintivo de procedencia, evidencia, tres propuestas, Logs, decisión humana y exportación.
- [ ] Un texto nuevo genera hasta tres claims, recupera evidencia oficial y muestra tres propuestas o degradaciones explícitas.
- [ ] Una URL pública compatible extrae texto y, cuando existen dentro de límites, imágenes o audio.
- [ ] Las seis categorías editoriales son las únicas disponibles y el selector inicia vacío.
- [ ] Evidencia primaria y contexto relacionado nunca se mezclan visualmente ni en el consenso.
- [ ] Todo resultado visible navega a una traza descargable y libre de secretos o chain-of-thought.
- [ ] La regla 2-de-3 y la mediana se recalculan a partir de las salidas mostradas.
- [ ] Los cinco casos conocidos pueden evaluarse sin filtrar sus resultados publicados a los modelos.
- [ ] La UI cumple navegación por teclado, etiquetas accesibles, contraste y diseño responsivo.
- [ ] Vitest cubre contratos, agregación, redacción de trazas, caché y errores; Playwright verifica el flujo y la aceptación visual.
- [ ] La demostración funciona en `informa-t.nimblersoft.com` y conserva una ruta de rollback al despliegue anterior.
- [ ] La Ficha de Gobernanza Ética refleja control humano, neutralidad, privacidad, procedencia y límites declarados.

## 9. Backlog de incubación

- Migrar proveedores en vivo a Cloudflare AI Gateway Unified Billing.
- Habilitar búsqueda web relacionada en vivo con citas.
- Añadir identidad, colaboración y persistencia editorial durable.
- Ampliar corpus, monitoreo de calidad y evaluación continua.
- Evaluar C2PA, análisis forense multimedia y señales de coordinación como módulos separados.
