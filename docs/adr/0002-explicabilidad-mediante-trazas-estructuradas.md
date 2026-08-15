---
titulo: "ADR-0002: Explicabilidad mediante trazas estructuradas"
tipo: adr
estado: aceptado
decidido_por: "Equipo de Producto MediaHack II"
fecha: 2026-08-15
fuentes:
  - "docs/specs/mediahack-prd-draft.md"
  - "CONTEXT.md"
---

# ADR-0002: Explicabilidad mediante trazas estructuradas

informa-t adoptara una traza de analisis estructurada y una pestana `Logs` como parte del resultado editorial. Cada elemento visible debera poder rastrearse hasta la entrada, la recuperacion de evidencia, la version del modelo y prompt, la salida estructurada, la regla de agregacion y los errores. Esta decision prioriza transparencia reproducible frente a una caja negra o a logs tecnicos inaccesibles.

La plataforma no almacenara ni presentara chain-of-thought, tokens privados de razonamiento o supuestas transcripciones del pensamiento del modelo. En su lugar solicitara una justificacion estructurada que identifique criterio, evidencia favorable y contraria, inferencia resumida, incertidumbre y limitaciones. Esto ofrece explicabilidad verificable sin confundir razonamiento generado con evidencia, exponer informacion sensible ni depender de capacidades privadas de un proveedor.

Como consecuencia, los contratos de todos los proveedores —incluidos fixtures del demo y modelos en vivo— deberan producir el mismo esquema de traza. Los resultados capturados se distinguiran visiblemente de los generados en vivo, y los secretos, credenciales y datos personales innecesarios se excluiran antes de persistir o mostrar eventos.
