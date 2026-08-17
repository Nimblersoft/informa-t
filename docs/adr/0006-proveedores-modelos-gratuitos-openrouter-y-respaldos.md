---
titulo: "ADR-0006: Adopción de modelos gratuitos OpenRouter como proveedor primario y respaldos"
tipo: adr
estado: aceptado
decidido_por: "Equipo de Producto informa-t"
fecha: 2026-08-17
reemplaza_parcialmente: "docs/adr/0004-runtime-cloudflare-y-modos-de-analisis.md"
fuentes:
  - "docs/specs/model-fallback.md"
  - "docs/specs/text-analysis-engine.md"
---

# ADR-0006: Adopción de modelos gratuitos OpenRouter como proveedor primario y respaldos

## 1. Contexto y Problema

Tras la fase de concurso de MediaHack II y con el objetivo de preservar la plataforma como un proyecto de código abierto activo y disponible para la comunidad sin costos recurrentes de infraestructura o inferencia, se requiere garantizar que la extracción y las propuestas multi-modelo funcionen con $0 de costo sin agotar cuotas de inferencia en Cloudflare ni requerir saldos de pago por uso.

## 2. Decisión

Se adopta **OpenRouter Free Tier (`:free`)** como el proveedor primario de inferencia para todas las etapas automatizadas:

1. **Extracción Supervisora:** Inferencia primaria mediante `google/gemma-4-31b-it:free` (contexto de 262k) enviando cabeceras `HTTP-Referer` y `X-Title`. Si falla o no está configurada la clave, se utiliza Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash`) como respaldo.
2. **Propuestas Multi-Modelo:** Inferencia primaria mediante modelos gratuitos diversos (`z-ai/glm-5.2:free`, `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-nano-30b-a3b:free`). Si un modelo falla, el sistema conmuta individualmente al modelo respectivo de Cloudflare Workers AI como respaldo.
3. **Desacoplamiento de Versionado de Propuestas:** Las propuestas multi-modelo entregan focos de revisión estructurados y no vinculantes de contraste documental sin atarse a esquemas rígidos de versionado.
4. **Respaldo Offline y Fixtures:** Sin conexión o sin credenciales, el sistema conserva los endpoints demo (`/api/demo/cases/a1`) basados en fixtures reproducibles.

## 3. Consecuencias

- Costo de inferencia nulo ($0) para operación comunitaria continua.
- Reducción de consumo de recursos en Cloudflare Workers AI.
- Resiliencia bidireccional: si un modelo gratuito externo se degrada, el runtime local de Workers AI entra automáticamente como respaldo preservando la proveniencia en la traza.
