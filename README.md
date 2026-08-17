# informa-t

informa-t es un MVP propuesto para MediaHack II que permite a periodistas y equipos de verificación examinar afirmaciones sobre información electoral con fuentes primarias auditables. Opera estrictamente como un asistente editorial de soporte a la decisión, preservando el control humano exclusivo sobre cualquier veredicto de verificación pública.

> [!NOTE]
> `prototype/index.html` es una referencia visual exploratoria no productiva. La implementación funcional y accesible del shell editorial reside en `src/client/` y se ejecuta mediante la aplicación React + Vite.

## Estado del Proyecto

El repositorio cuenta con la implementación funcional del shell editorial para el Caso A1, compuesta por:
- Flujo estructurado de extractos primarios y contexto relacionado separado.
- Panel analítico con pestañas WAI-ARIA (`Evidencia`, `Modelos` y `Logs`).
- Trazabilidad auditable con eventos inmutables y enlaces a fuentes primarias abiertas.
- Auditoría interna de decisiones del extractor en D1 durante siete días, sin guardar el texto fuente completo ni exponer lectura pública.
- Límite de decisión editorial humana con máquina de estados local y exportación de estándares `ClaimReview` (JSON-LD) y traza de auditoría (JSON).
- Accesibilidad integral por teclado (WCAG 2.1 AA) y diseño adaptativo libre de desbordamiento horizontal en pantallas de escritorio (1440×900) y móviles (390×844).

## Inicio Rápido

### Requisitos previos
- Node.js 20+
- npm 10+

### Instalación de dependencias
```bash
npm install
```

### Ejecución en modo desarrollo
Inicia el servidor local de desarrollo con Vite:
```bash
npm run dev
```

### Compilación para producción
Genera el paquete optimizado de producción:
```bash
npm run build
```

### Ejecución de pruebas
Ejecuta la suite completa de pruebas unitarias (Vitest) y pruebas de extremo a extremo (Playwright):
```bash
npm test
```

Para ejecutar suites específicas:
```bash
# Pruebas unitarias
npm run test:unit

# Pruebas e2e (accesibilidad, responsive y flujos editoriales)
npm run test:e2e
```

## Colaboración Abierta y Continuidad del Proyecto

`informa-t` es un proyecto de código abierto disponible para periodistas, investigadores y desarrolladores que deseen colaborar en herramientas de verificación auditable y trazabilidad documental.

### Modelos Gratuitos de OpenRouter y Presupuesto Cero
El motor está optimizado para operar sin costos recurrentes utilizando modelos de nivel gratuito (`:free`) de [OpenRouter](https://openrouter.ai):
- **Extractor Supervisor:** `google/gemma-4-31b-it:free` (extracción estructurada de aseveraciones con contexto de 262k).
- **Propuestas Multi-Modelo:** Respaldos automáticos a `z-ai/glm-5.2:free`, `google/gemma-4-31b-it:free` y `nvidia/nemotron-3-nano-30b-a3b:free`.
- **Ejecución Local / Pruebas:** Opera con fixtures sintéticos sin requerir claves de API externas.

### Endpoints Disponibles
- `GET /api/demo/cases/a1`: Caso demo A1 estructurado con trazabilidad y citas completas.
- `POST /api/analyses`: Pipeline de análisis en vivo por SSE (recibe `{ text: string }` o `{ url: string }`).

## Documentación

- [AGENTS.md](AGENTS.md): contexto operativo para agentes, comandos y arquitectura.
- [CONTEXT.md](CONTEXT.md): glosario canónico del dominio.
- [docs/index.md](docs/index.md): mapa de documentación del repositorio.
- [docs/specs/accessibility-shell.md](docs/specs/accessibility-shell.md): especificación de accesibilidad, teclado y diseño adaptativo.
- [docs/specs/editorial-panel.md](docs/specs/editorial-panel.md): especificación del panel de revisión editorial.
- [docs/specs/editorial-decision.md](docs/specs/editorial-decision.md): especificación de la frontera de decisión editorial y exportaciones.
- [docs/specs/model-fallback.md](docs/specs/model-fallback.md): especificación de modelos gratuitos OpenRouter y respaldos Workers AI.
- [docs/specs/claim-extraction-audit.md](docs/specs/claim-extraction-audit.md): datos, retención y degradación de la auditoría D1.
- [docs/specs/mediahack-prd-draft.md](docs/specs/mediahack-prd-draft.md): contrato funcional del MVP de MediaHack II.

## Referencias

- [Cuaderno de referencia de MediaHack II](https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40)
- [Notas del equipo y borradores de ideas](https://docs.google.com/document/d/1tGYZESz2_R-wdWekXdu9wwhg4QKUGBKB-r0fIffOqbg/edit)
