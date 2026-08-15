# Documentacion de informa-t

Indice de la wiki del proyecto. El contexto operativo para agentes esta en [AGENTS.md](../AGENTS.md); la terminologia del dominio esta en [CONTEXT.md](../CONTEXT.md).

| Ubicacion | Contiene | Responde |
|---|---|---|
| [`adr/`](adr/) | Registros de decisiones arquitectonicas | Por que se tomo una decision? |
| [`specs/`](specs/) | Contratos del producto y sus modulos | Que debe hacer el producto o el modulo? |
| [`docs-organization-blueprint.md`](docs-organization-blueprint.md) | Reglas de archivado y esquemas documentales | Donde debe guardarse un documento? |

## Registros de Decisiones Arquitectónicas (ADR)

- [ADR-0001: Arquitectura de Interfaz - Flujo Vertical de Extractos y Panel de Despliegue de Análisis Reactivo](adr/0001-ui-flujo-vertical-extractos-y-panel-despliegue-analisis.md) - Registro histórico reemplazado por ADR-0003.
- [ADR-0002: Explicabilidad mediante trazas estructuradas](adr/0002-explicabilidad-mediante-trazas-estructuradas.md) - Define la pestana de logs auditables y el limite entre justificacion estructurada y razonamiento interno privado.
- [ADR-0003: Interfaz editorial con evidencia, modelos y logs](adr/0003-ui-editorial-con-evidencia-modelos-y-logs.md) - Fija el flujo de extractos, las pestañas analíticas, los seis veredictos y los índices normalizados.
- [ADR-0004: Runtime Cloudflare y modos de análisis](adr/0004-runtime-cloudflare-y-modos-de-analisis.md) - Fija el stack mínimo, los bindings y la separación entre fixtures capturados e inferencia en vivo.

## Especificaciones

- [Especificación del MVP de MediaHack](specs/mediahack-prd-draft.md) - contrato funcional y técnico vigente para implementar el prototipo.

## Investigacion

- [Corpus oficial y casos reales para el demo](research/corpus-oficial-y-casos-demo.md) - registro inicial de fuentes, taxonomia editorial y casos conocidos para evaluar el prototipo.
