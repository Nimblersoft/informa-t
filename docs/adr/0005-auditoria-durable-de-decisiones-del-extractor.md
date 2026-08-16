---
titulo: "ADR-0005: Auditoría durable de decisiones del extractor"
tipo: adr
estado: aceptado
decidido_por: "Equipo de Producto MediaHack II"
fecha: 2026-08-16
fuentes:
  - "docs/specs/claim-extraction-audit.md"
  - "docs/adr/0004-runtime-cloudflare-y-modos-de-analisis.md"
---

# ADR-0005: Auditoría durable de decisiones del extractor

Se supersede únicamente la prohibición de D1 establecida en ADR-0004 para añadir el binding privado `AUDIT_DB`. El Worker conservará D1 solo para auditar decisiones de extracción y no ofrecerá un endpoint público de lectura.

Cada aseveración extraída se registra con su texto literal, decisión, disposición del pipeline, rationale breve, proveniencia del modelo, versiones, hash canónico, degradaciones y timestamps de retención. No se guardan el cuerpo fuente completo, URL fuente completa, cabeceras, IP, secretos, resultados editoriales ni cadena de pensamiento.

Las filas son append-only desde la aplicación, únicas por `(analysis_id, claim_index)` y se eliminan después de siete días mediante Cron Trigger. La escritura ocurre antes del evento SSE `claim.extracted`; si falta el binding, agota cinco segundos o falla D1, el análisis continúa hacia evidencia y propuestas, pero comunica la degradación y termina `partial`.
