# Plan de Organizacion Documental de informa-t

Este documento define como se organiza la documentacion en este repositorio: la separacion entre material versionado y no versionado, la estructura de directorios, las reglas de archivado que evitan superposiciones y los metadatos que lleva cada documento.

---

## 1. Separacion Clara: Wiki Versionada y Espacio de Borradores

Dos entornos deliberadamente separados:

| | **Wiki versionada** (`docs/`) | **Espacio de borradores** (sin versionar) |
|---|---|---|
| **Contiene** | Invariantes, contratos, decisiones y runbooks | Notas sin procesar, transcripciones de reuniones, recortes, borradores y resultados completos de investigacion |
| **Confianza** | Alta: revisada, vigente y segura para actuar | Baja: sin revision, posiblemente desactualizada o contradictoria |
| **Ciclo de vida** | Seguida por Git, revisada y comparable | De edicion libre, nunca revisada y descartable |
| **Audiencia** | Personas y agentes, como fuente de verdad | Personas trabajando ideas; agentes que la leen solo como insumo |

**Reglas:**

1. **El repositorio es la SSOT.** `docs/` es la unica fuente de verdad para arquitectura, decisiones, contratos y procedimientos. Nada fuera de ella es autoritativo.
2. **Los borradores son insumo, nunca resultado.** Un agente puede leer el espacio de borradores para sintetizar un documento, pero el resultado sintetizado se confirma en `docs/`.
3. **No hay superficie compartida de escritura.** No montar ni sincronizar el espacio de borradores dentro del arbol de trabajo del repositorio. Leerlo por su propia interfaz, sintetizar y confirmar los cambios.
4. **Citar, no insertar.** Cuando un archivo de `docs/` sintetiza material extenso, debe expresar la conclusion y enlazar a la fuente completa en lugar de copiarla.

> **Espacio de borradores del proyecto:** [notas del equipo y borradores de ideas en Google Docs](https://docs.google.com/document/d/1tGYZESz2_R-wdWekXdu9wwhg4QKUGBKB-r0fIffOqbg/edit). El cuaderno de NotebookLM de MediaHack II es una referencia separada y de solo lectura para reglas y prioridades: <https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40>.

---

## 2. Sistema de Organizacion

Una **estructura hibrida de carpetas y etiquetas**:

- **Carpetas para espacios de nombres** que aislan tipos documentales y evitan colisiones de nombres.
- **Etiquetas para tipificacion** que clasifican el tipo documental y los asuntos transversales mediante metadatos YAML.

---

## 3. Estructura de Directorios

```
<repo>/
├── AGENTS.md                        # Contexto operativo central para agentes (SSOT)
├── CLAUDE.md                        # Referencia breve a AGENTS.md
├── CONTEXT.md                       # Glosario del dominio
├── README.md                        # Resumen para personas
└── docs/
    ├── index.md                     # Portada de la wiki y mapa documental
    ├── docs-organization-blueprint.md  # Este archivo
    ├── adr/                         # Registros de decisiones arquitectónicas
    ├── specs/                       # Contratos de módulos y especificaciones funcionales
    ├── architecture/                # Diseños de sistema, topologías y diagramas C4
    ├── processes/                   # Políticas, gobernanza y límites permanentes
    ├── workflows/                   # Flujos de ciclo de vida entre sistemas
    ├── runbooks/                    # Guías operativas paso a paso
    └── research/                    # Conclusiones e informes; fuentes completas en borradores
```

Crear una carpeta cuando reciba su primer archivo real. `adr/` y `specs/` siempre existen. No crear directorios vacíos para uso futuro.

### Reglas de Categorización Delimitada

| Ubicacion | Destino | Audiencia y uso | Pregunta principal |
|---|---|---|---|
| `skills/` | Logica ejecutable de agentes | Solo para el arnes de agentes | Que capacidades posee el agente? |
| `docs/adr/` | Registros de decisiones | Personas y agentes | ¿Por qué se construye de esta manera? |
| `docs/specs/` | Contratos de módulos y funciones | Personas y agentes | ¿Qué debe hacer este módulo? |
| `docs/architecture/` | Diseños estructurales | Personas y agentes | ¿Qué se conecta con qué? |
| `docs/processes/` | Políticas y guías permanentes | Personas y agentes | ¿Cuáles son las reglas y límites? |
| `docs/workflows/` | Rutas del ciclo de vida | Personas y agentes | ¿Cómo fluye el trabajo de inicio a fin? |
| `docs/runbooks/` | Guías operativas | Personas o agentes autorizados | ¿Qué comandos exactos debo ejecutar? |
| `docs/research/` | Conclusiones de investigación | Personas y agentes | ¿Qué aprendimos y recomendamos? |
| `docs/templates/` | Plantillas documentales | Personas y agentes | ¿Qué estructura debe usar este documento? |

- **ADR frente a especificación:** un ADR registra una elección entre alternativas y queda congelado al decidirse; una especificación registra el comportamiento requerido vigente y cambia junto con ese comportamiento.
- **Flujo frente a guía operativa:** un flujo explica un ciclo de vida y sus transiciones; una guía operativa entrega comandos exactos. Si puede copiarse y pegarse, pertenece a `docs/runbooks/`.

---

## 4. Esquema de Metadatos y Convenciones de Frontmatter

Cada documento lleva metadatos YAML estandar para que las herramientas de consulta puedan filtrarlo.

### A. Documento de Proyecto o Concepto

```yaml
---
titulo: "Subsistema de autenticacion"
tipo: concepto | entidad | indice
estado: activo | necesita-revision | desactualizado
confianza: alta | media | baja
fuentes:
  - "<enlace al original del espacio de borradores del que se sintetizo>"
etiquetas:
  - autenticacion
  - seguridad
ultima_revision: <AAAA-MM-DD>
---
```

### B. Registro de Decisión (ADR)

```yaml
---
titulo: "ADR-0001: <Decisión>"
tipo: adr
estado: propuesto | aceptado | reemplazado
decidido_por: <nombre>
fecha: <AAAA-MM-DD>
reemplaza: "docs/adr/<nnnn>-<slug>.md" # omitir si no aplica
---
```

### C. Especificacion

```yaml
---
titulo: "Especificacion: <modulo>"
tipo: especificacion
estado: activa | reemplazada
cubre: <ruta de fuente regida por esta especificacion>
ultima_revision: <AAAA-MM-DD>
---
```

`estado` y `ultima_revision` hacen detectable el desuso; marcar un documento como desactualizado en lugar de dejarlo desinformar silenciosamente.

---

## 5. Vistas Compiladas

Los metadatos permiten vistas compiladas, como colas de revision de documentos desactualizados, registros de ADR y listados tematicos entre carpetas.

> **Compilador de vistas:** ninguno; los indices se mantienen manualmente.
