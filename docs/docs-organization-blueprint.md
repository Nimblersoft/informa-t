# informa-t Documentation Blueprint

This document defines how documentation is organized in this repository: the divide between versioned and unversioned material, the directory layout, the filing rules that keep folders from overlapping, and the frontmatter every document carries.

---

## 1. The Clean Divide: Versioned Wiki vs. Scratch Space

Two environments, deliberately separated:

| | **Versioned wiki** (`docs/`) | **Scratch space** (unversioned) |
|---|---|---|
| **Contains** | Invariants, contracts, decisions, runbooks | Raw notes, meeting transcripts, clippings, work-in-progress drafts, full research dumps |
| **Trust** | High — reviewed, current, safe to act on | Low — unreviewed, possibly stale or contradictory |
| **Lifecycle** | Git-tracked, reviewed, diffable | Freely edited, never reviewed, disposable |
| **Audience** | Humans + agents, as source of truth | Humans thinking out loud; agents reading for input only |

**Rules:**

1. **The repository is the SSOT.** `docs/` is the single source of truth for architecture, decisions, contracts, and procedures. Nothing outside it is authoritative.
2. **Scratch is input, never output.** An agent may read the scratch space to synthesize a document, but the synthesized result is committed to `docs/`.
3. **No shared write surface.** Do not mount or sync the scratch space into the repository working tree. Read it over its own interface, synthesize, then commit.
4. **Cite, don't inline.** When a `docs/` file distills something large, state the takeaway and link to the full source rather than pasting it in.

> **This project's scratch space:** [Google Doc team notes and idea drafts](https://docs.google.com/document/d/1tGYZESz2_R-wdWekXdu9wwhg4QKUGBKB-r0fIffOqbg/edit). The MediaHack II NotebookLM notebook is a separate read-only rules and priorities reference: <https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40>.

---

## 2. Organization System

A **hybrid folder/tag structure**:

- **Folders for namespacing** isolate document kinds and prevent naming collisions.
- **Tags for typing** classify document type and cross-cutting concerns through YAML frontmatter.

---

## 3. Directory Layout

```
<repo>/
├── AGENTS.md                        # Core agent operational context (SSOT)
├── CLAUDE.md                        # Thin pointer to AGENTS.md
├── CONTEXT.md                       # Domain glossary
├── README.md                        # Human-facing overview
└── docs/
    ├── index.md                     # Wiki landing page / document map
    ├── docs-organization-blueprint.md  # This file
    ├── adr/                         # Architectural Decision Records (technical choices)
    ├── specs/                       # Module contracts and feature specifications
    ├── architecture/                # System designs, topologies, C4 structural diagrams
    ├── processes/                   # Standing policies, governance, boundaries
    ├── workflows/                   # Lifecycle flows spanning multiple systems
    ├── runbooks/                    # Step-by-step command recipes
    └── research/                    # Takeaways and reports (full sources in scratch)
```

Create a folder when it earns its first real file. `adr/` and `specs/` always exist. Do not scaffold empty directories for future use.

### Bounded Categorization Rules

| Location | Target | Audience / Use | Primary Question Answered |
|---|---|---|---|
| `skills/` | Executable agent logic | Agent harness only | What capabilities does the agent possess? |
| `docs/adr/` | Decision records | Humans and agents | Why is it built this way? |
| `docs/specs/` | Module and feature contracts | Humans and agents | What must this module do? |
| `docs/architecture/` | Structural designs | Humans and agents | What is wired to what? |
| `docs/processes/` | Standing policies and guidelines | Humans and agents | What are the rules and boundaries? |
| `docs/workflows/` | Lifecycle pathways | Humans and agents | How does work flow from start to completion? |
| `docs/runbooks/` | Technical action recipes | Humans or authorized agents | What exact commands do I run? |
| `docs/research/` | Research takeaways | Humans and agents | What did we learn and recommend? |
| `docs/templates/` | Document templates | Humans and agents | What layout should this document use? |

- **ADR vs. spec:** an ADR records a choice between alternatives and freezes when decided; a spec records current required behavior and changes with behavior.
- **Workflow vs. runbook:** a workflow explains a lifecycle and transitions; a runbook gives exact commands. If a reader could copy-paste it, it is a runbook.

---

## 4. Metadata Schema and Frontmatter Conventions

Every document carries standard YAML frontmatter so parsers and query tooling can filter it.

### A. Project / Concept Document

```yaml
---
title: "Authentication Subsystem"
type: concept | entity | index
status: active | review-needed | stale
confidence: strong | moderate | weak
sources:
  - "<link to the scratch-space original this was synthesized from>"
tags:
  - auth
  - security
last_checked: <YYYY-MM-DD>
---
```

### B. Decision Record (ADR)

```yaml
---
title: "ADR-0001: <Decision>"
type: adr
status: proposed | accepted | superseded
decided_by: <name>
date: <YYYY-MM-DD>
supersedes: "docs/adr/<nnnn>-<slug>.md" # omit if none
---
```

### C. Spec

```yaml
---
title: "Spec: <module>"
type: spec
status: active | superseded
covers: <source path this spec governs>
last_checked: <YYYY-MM-DD>
---
```

`status` and `last_checked` make staleness detectable; mark a document stale rather than silently leaving it to mislead.

---

## 5. Compiled Views

The frontmatter supports compiled views such as stale-document review queues, ADR logs, and cross-folder topic listings.

> **View compiler:** none — indexes are hand-maintained.
