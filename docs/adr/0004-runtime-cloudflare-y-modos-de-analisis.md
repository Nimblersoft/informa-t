---
titulo: "ADR-0004: Runtime Cloudflare y modos de análisis"
tipo: adr
estado: aceptado
decidido_por: "Equipo de Producto MediaHack II"
fecha: 2026-08-15
fuentes:
  - "docs/specs/mediahack-prd-draft.md"
  - "docs/research/corpus-oficial-y-casos-demo.md"
---

# ADR-0004: Runtime Cloudflare y modos de análisis

El prototipo usará un Worker TypeScript de origen único con Hono, React y Workers Static Assets; AI Search para el corpus curado; Workers AI para inferencia, visión y transcripción; Browser Run para extracción web; y KV para caché temporal. Se evitan D1, R2, Queues, Workflows y Durable Objects porque el flujo de una sola sesión editorial y la descarga de la traza no los requieren.

Habrá dos modalidades detrás del mismo contrato. `capturado` sirve fixtures producidos manualmente para los casos conocidos y debe identificarlos como demostración; `en_vivo` usa exclusivamente bindings de Cloudflare. Las suscripciones personales, OAuth y los CLI `agy` o Kilo no serán invocados por solicitudes de la aplicación. Esta separación reduce el riesgo operativo y contractual del demo, permite una experiencia reproducible y deja una costura explícita para añadir Cloudflare AI Gateway durante incubación.

Como consecuencia, el desarrollo local de AI Search y Browser Run requiere modo remoto, la creación de recursos y el despliegue son acciones de infraestructura con control humano, y cada proveedor debe devolver el mismo esquema de propuesta y traza.
