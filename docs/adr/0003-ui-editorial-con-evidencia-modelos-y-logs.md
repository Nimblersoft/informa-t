---
titulo: "ADR-0003: Interfaz editorial con evidencia, modelos y logs"
tipo: adr
estado: aceptado
decidido_por: "Equipo de Producto MediaHack II"
fecha: 2026-08-15
reemplaza: "docs/adr/0001-ui-flujo-vertical-extractos-y-panel-despliegue-analisis.md"
fuentes:
  - "docs/specs/mediahack-prd-draft.md"
  - "src/client/components/PrototypePreview.tsx"
---

# ADR-0003: Interfaz editorial con evidencia, modelos y logs

informa-t conserva el flujo de dos paneles de la Variante A del prototipo: extractos del contenido original a la izquierda y análisis del extracto activo a la derecha. El panel de análisis se divide en las pestañas **Evidencia**, **Modelos** y **Logs** para separar fuentes primarias, propuestas no vinculantes y trazabilidad técnica. En pantallas estrechas los paneles se apilan sin cambiar el orden editorial.

Esta decisión reemplaza ADR-0001 para corregir dos contratos que cambiaron durante la revisión. Los indicadores de polarización, carga emocional y sustento en datos públicos son índices heurísticos normalizados de 0 a 100, no porcentajes medidos. La decisión humana utiliza únicamente Cierto, Falso, Impreciso, Engañoso, Sátira o Inverificable; el selector inicia vacío y ninguna propuesta de modelo lo completa automáticamente.

La consecuencia es que el componente de prototipo sirve como referencia visual, no como fuente de datos ni contrato de comportamiento. Su lista de cuatro veredictos, sus porcentajes y sus fixtures deben sustituirse durante la implementación por los contratos vigentes del PRD.
