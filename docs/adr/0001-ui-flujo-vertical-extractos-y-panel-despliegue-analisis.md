---
titulo: "ADR-0001: Arquitectura de Interfaz - Flujo Vertical de Extractos y Panel de Despliegue de Análisis Reactivo"
tipo: adr
estado: reemplazado
decidido_por: "Mesa Editorial y de Producto MediaHack II"
fecha: 2026-08-15
reemplazado_por: "docs/adr/0003-ui-editorial-con-evidencia-modelos-y-logs.md"
fuentes:
  - "docs/specs/mediahack-prd-draft.md"
  - "https://notebook.google.com/notebook/d4459705-32df-4b72-8c47-6a4730d5f461"
  - "prototype/index.html"
---

# ADR-0001: Arquitectura de Interfaz - Flujo Vertical de Extractos y Panel de Despliegue de Análisis Reactivo

## 1. Contexto y Problema

Para la plataforma **informa-t** (MVP de MediaHack II), periodistas y salas de redacción requieren una interfaz para investigar publicaciones dudosas y contrastarlas contra fuentes primarias oficiales (planes de trabajo registrados ante el CNE, encuestas del INEC, legislación vigente). 

Durante el proceso de prototipado interactivo ([`prototype/index.html`](../../prototype/index.html)) se evaluaron tres propuestas estructurales de interfaz y se consultaron las recomendaciones del proyecto **Stanford Web Credibility**, la norma **JTI (CEN CWA 17493)**, los **8 Indicadores de The Trust Project** y los patrones de diseño de **AI UX (Citations & Verification Lifecycle)**.

Un reto central identificado es que un documento, video o URL de campaña electoral contiene múltiples aseveraciones fácticas distribuidas a lo largo de varios minutos o párrafos. Tratar el documento como un bloque monolítico genera ambigüedad, oculta discrepancias específicas y dificulta la emisión de calificaciones editoriales precisas.

## 2. Decisión

Se adopta la **Variante A: Flujo Vertical de Extractos con Panel de Despliegue de Análisis Reactivo** como el diseño base y arquitectura de interfaz oficial de la plataforma:

1. **Panel Izquierdo (Stream de Contenido Original):** Muestra el contenido original (transcripción audiovisual o texto web) dividido cronológicamente en tarjetas de **Extractos Temáticos** (`Extracto 1: 00:15 - 00:48`, `Extracto 2: 01:20 - 02:05`, etc.), con resaltado sutil de frases clave y filtrado de retórica/opinión no verificable (Filtro Faktabaari / IFCN).
2. **Panel Derecho (Despliegue del Análisis del Extracto Activo):** Al seleccionar cualquier extracto en el stream izquierdo, el panel derecho despliega en tiempo real:
   - **Descomposición Fáctica:** Aseveraciones atómicas con chips institucionales adyacentes (`🏛️ cne.gob.ec (Pág. 14)`, `📊 inec.gob.ec`, `🏦 bce.fin.ec`) e impugnación granular de fuentes.
   - **Cotejo con Fuente Primaria Oficial:** Cita textual oficial del plan de trabajo CNE o informe técnico con número de página y hash de integridad criptográfica (SHA-256).
   - **Filtro de Tres Preguntas (Faktabaari / IFCN):** Evaluación de verificabilidad fáctica, relevancia electoral y accesibilidad de fuentes.
   - **Test de Discordancia & Intencionalidad:** Métricas visuales de polarización discursiva (%), carga emocional/urgencia (%) y sustento en datos públicos (%).
   - **Decisión Editorial Humana (Human-in-the-Loop):** Selector de veredicto (*Consistente*, *Engañoso*, *Falso*, *Opinión*) y justificación redactada y firmada por el periodista.
3. **Interoperabilidad `ClaimReview` (Schema.org):** Exportación estructurada JSON-LD utilizando la propiedad `hasPart` para vincular cada extracto calificado al documento fuente principal para Google Fact Check Explorer.

## 3. Justificación y Fundamentos de Confianza

- **Efecto de Mejoramiento Visual (46.1% de la percepción de credibilidad):** La disposición simétrica en dos columnas, la tipografía editorial clara y la ausencia de elementos distractores transmiten rigor institucional.
- **Reducción de Carga Cognitiva:** El periodista no necesita alternar entre múltiples pestañas para validar la cita: el cotejo documental y las métricas aparecen al lado del texto original.
- **Transparencia en IA (Apertura de la Caja Negra):** La plataforma no oculta el proceso de extracción; muestra la cita textual exacta de la que se derivó el contraste y ofrece trazabilidad auditable.
- **Gobernanza Ética y Control Humano:** El sistema se mantiene estrictamente como copiloto analítico, reservando la decisión pública y calificación final al periodista responsable.

## 4. Consecuencias

- **Positivas:**
  - Granularidad y precisión en la verificación electoral de declaraciones extensas.
  - Flujo de trabajo rápido y reproducible para salas de redacción y observatorios cívicos.
  - Compatibilidad directa con estándares internacionales de fact-checking y metadatos abiertos.
- **Consideraciones de Implementación:**
  - El motor de procesamiento backend (Web-Reader, Whisper, LLM desacoplado) debe retornar una lista estructurada de extractos con marcas de tiempo/párrafo y aseveraciones asociadas.
  - El visor debe manejar documentos largos optimizando el renderizado en clientes web.
