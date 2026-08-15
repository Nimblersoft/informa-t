---
titulo: "Borrador de PRD: MVP de informa-t para MediaHack II"
tipo: especificacion
estado: necesita-revision
cubre: "<!-- TODO: aun no existen modulos de implementacion -->"
fuentes:
  - "Mediahack PRD Draft.md proporcionado por la persona usuaria"
  - "https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40"
ultima_revision: 2026-08-15
---

# Documento de Requerimientos de Producto (PRD)

## 1. Informacion General del Documento

- **Nombre del Producto:** Plataforma de Observabilidad, Trazabilidad y Validacion de Informacion Electoral (Asistente de Fact-Checking y Analisis de Fuentes).
- **Contexto:** Prototipado para **MediaHack II: Inteligencia Artificial, Democracia y Desinformacion Electoral** (Quito, Ecuador).
- **Estado:** Borrador de especificacion tecnica y funcional para MVP.

## 2. Vision del Producto y Problema

### 2.1. Problema Identificado

En el ecosistema informativo ecuatoriano durante periodos electorales, la desinformacion se propaga con rapidez a traves de redes y canales masivos, como X/Twitter, Facebook y mensajeria como WhatsApp. Los periodistas y salas de redaccion se enfrentan a cuellos de botella para verificar afirmaciones porque los datos de fuentes oficiales y repositorios publicos carecen de APIs unificadas, formatos estructurados o esquemas estandarizados para su contraste agil.

### 2.2. Propuesta de Valor y Solucion

Una plataforma de observabilidad, trazabilidad y agregacion analitica de informacion que opera como un **copiloto o asistente tecnico** para el periodista. Centraliza el analisis de publicaciones dudosas, cruza datos con fuentes primarias institucionales y genera un desglose analitico con evidencia verificable. La herramienta se disena bajo supervision humana: la IA asiste en la extraccion y contrastacion, pero el juicio editorial final reside en el usuario.

### 2.3. Audiencia Objetivo

1. **Audiencia primaria:** Salas de redaccion, periodistas de investigacion, equipos de fact-checking y organizaciones de la sociedad civil que monitorean el proceso electoral.
2. **Audiencia secundaria:** Ciudadania informada que consume contenidos verificados producidos por medios aliados.

## 3. Arquitectura y Gobernanza Etica

- **Supervision humana obligatoria:** El sistema no emitira veredictos publicos automatizados ni etiquetara autonomamente una noticia como falsa sin validacion explicita de un periodista.
- **Neutralidad politica y transparencia:** La contrastacion remitira a fuentes primarias documentales auditables, como archivos oficiales, planes de trabajo del CNE y normativas, sin sesgos hacia ninguna tienda o figura politica.
- **Proteccion de datos (LOPDP):** No realizara perfilamiento politico de ciudadanos ni almacenamiento indebido de informacion personal.
- **Estandares e interoperabilidad:** Estructuracion de datos basada en esquemas abiertos y reconocidos como ClaimReview de Schema.org.

## 4. Alcance del Producto

| Modulo o funcionalidad | Alcance MVP | Backlog futuro |
|---|---:|---:|
| Extraccion de contenido web (Web-Reader) | Si | |
| Busqueda web en vivo (Web-Search) | Si | |
| Ingesta curada inicial (RAG planes CNE) | Si | |
| Descomposicion factica de claims (headless CLI) | Si | |
| Cruce de evidencias y citas primarias | Si | |
| UI de validacion y exportacion ClaimReview | Si | |
| Analisis multimodal de intencionalidad | Si | |
| Deteccion de sinteticos, deepfakes o clonacion de voz | | Si |
| Mapeo de redes de bots y comportamiento coordinado | | Si |
| Analisis forense de pixeles e imagenes | | Si |
| Red colaborativa intermedios y alertas en tiempo real | | Si |
| Extension de navegador o bot de mensajeria | | Si |
| Inspeccion de credenciales C2PA | | Si |

### 4.1. Estrategia de Metodologia y Fuentes para el MVP

- Integrar herramientas REST para lectura estructurada de articulos web y rastreo de contexto complementario.
- Realizar una ingesta RAG previa, acotada a planes del CNE y datos globales INEC, indexada localmente con metadatos de pagina y candidato.
- Invocar un LLM desacoplado mediante CLI local para aislar de dos a tres aseveraciones facticas y contrastarlas con fragmentos recuperados.
- Adaptar el Filtro de las Tres Preguntas de Faktabaari y los estandares de verificabilidad y replicabilidad de IFCN.
- Procesar imagenes, audios o videos con un modelo multimodal para generar descripciones textuales, identificar personajes y determinar intencionalidad contextual; no es analisis forense.

### 4.2. Metodologias de Prioridad Baja

- **Test de la Discordancia:** Alertar sobre patrones linguisticos de polarizacion extrema.
- **Matriz de Cobertura Paralela:** Contrastar lo que afirma la publicacion frente a lo que dice el plan oficial.

### 4.3. Fuera del Alcance MVP

- Analisis forense de pixeles, demasiado complejo para 36 horas.
- Deteccion de voz sintetica o deepfakes, con alto riesgo de falsos positivos.
- Scraping masivo de redes, no viable para una demo en vivo.

### 4.4. Matriz de Integracion del MVP

| Etapa | Componentes y funcionalidades |
|---|---|
| Entrada | URL, texto, archivo |
| Procesamiento | Filtro de Tres Preguntas; API Fact Check Explorer o DBKF; cruce con repositorios CNE y oficiales |
| Analisis | Panel del periodista, ficha factica, fuentes auditables, Test de Discordancia, trazabilidad y metadatos C2PA |
| Validacion | Validacion humana, criterio editorial del periodista y exportacion estructurada ClaimReview |

## 5. Especificaciones Funcionales

| ID | Modulo o funcionalidad | Descripcion | Criterio de aceptacion |
|---|---|---|---|
| F-01 | Interfaz intuitiva de consulta | Formulario para texto, enlaces de redes sociales o afirmaciones publicas. | El usuario visualiza resultados y desglose de metricas en una sola vista en menos de cinco segundos. |
| F-02 | Validacion institucional | Motor que consulta planes de gobierno del CNE, datasets del INEC, leyes o archivos de prensa estructurados. | Resalta coincidencias o contradicciones directas entre la afirmacion y texto oficial registrado. |
| F-03 | Contexto e intencionalidad | Clasifica tono, polarizacion, ataque, descontextualizacion o lenguaje emotivo. | Muestra indicadores de posible sesgo discursivo o narrativa de ataque como insumo para el periodista. |
| F-04 | Evidencia y trazabilidad | Genera ficha auditable con enlaces directos y citas textuales. | Cada afirmacion incluye fuentes primarias obligatorias para verificacion manual. |
| F-05 | Formatos multimedia | Acepta texto plano, enlaces a publicaciones y documentos base, incluidos PDF de planes de trabajo. | Puede parsear texto de fuentes web y documentos sin errores de codificacion. |

### 5.1. Desglose del Analisis Tecnico

- **Validacion de fuentes:** Cruce sistematico con metadatos de repositorios gubernamentales, bases de datos estructuradas de verificacion previa y fuentes de prensa.
- **Mapeo de actores y narrativas:** Extraccion de entidades nombradas, como personas, partidos y organizaciones, para situar la afirmacion en la coyuntura electoral.
- **Contextualizacion de camaras de eco:** Identificacion de patrones discursivos que explotan ejes polarizantes recurrentes en campanas.

## 6. Backlog de Incubacion

- **B-01:** Deteccion de origen y contenido sintetico, incluidos audio clonado, imagenes manipuladas y deepfakes.
- **B-02:** Deteccion de anomalias, granjas de bots y amplificacion inorganica mediante grafos.
- **B-03:** Analisis forense multimedia a nivel de pixel, CheckGIF, EXIF y lupa forense.
- **B-04:** Red colaborativa intermedios para intercambio de verificaciones y alertas tempranas.
- **B-05:** Extension de navegador y agentes conversacionales para distribucion comunitaria.
- **B-06:** Lectura y validacion de manifiestos C2PA.

## 7. Criterios de Exito para el Demo

- Demostracion en vivo de un caso de estudio real de coyuntura electoral, por ejemplo una afirmacion atribuida a un candidato contrastada con su plan oficial ante el CNE.
- Flujo visible: **ingesta de datos -> analisis y cruce automatico -> despliegue de evidencias -> validacion y decision editorial humana**.
- Aprobacion sin observaciones de la Ficha de Gobernanza Etica del Proyecto.
