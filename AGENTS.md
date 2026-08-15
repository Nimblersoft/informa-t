# informa-t - Agent Guide

informa-t is a proposed MediaHack II MVP for journalists and fact-checking teams to investigate electoral-information claims against auditable primary sources. It assists analysis and evidence tracing; an editor retains every public verification decision.

> [!IMPORTANT]
> **No implementation yet.** Do not add application code until `docs/specs/mediahack-prd-draft.md` is refined and an implementation plan is approved.

> [!WARNING]
> `AGENTS.md` is the agent-context SSOT. Domain terminology belongs in [CONTEXT.md](CONTEXT.md); decisions in `docs/adr/`; specifications in `docs/specs/`. Filing rules: [docs/docs-organization-blueprint.md](docs/docs-organization-blueprint.md).

## Layout

```
AGENTS.md                         agent working context
CLAUDE.md                         pointer to AGENTS.md
CONTEXT.md                        domain glossary
README.md                         human-facing overview
docs/index.md                     documentation map
docs/specs/mediahack-prd-draft.md supplied MVP PRD draft
docs/adr/                         future architectural decisions
```

## Current Scope

- The current work is PRD refinement and implementation planning only.
- Hackathon reference: [NotebookLM](https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40). Query it through NotebookLM MCP or CLI when interpreting rules and priorities.
- Team ideation scratch space: [Google Doc](https://docs.google.com/document/d/1tGYZESz2_R-wdWekXdu9wwhg4QKUGBKB-r0fIffOqbg/edit). It is input, not an authoritative product contract.

## Product Guardrails

- **Human editorial control.** Never emit or publish an autonomous true/false verdict; a journalist makes the editorial decision.
- **Auditable evidence.** Analysis must trace claims to cited, linkable primary sources so a journalist can reproduce the review.
- **Political neutrality and privacy.** Apply equivalent treatment across political actors; do not profile citizens by political views or retain unnecessary personal data.
- **Narrow MVP.** Prioritize a working, live-demonstrable evidence flow over broad or forensic capabilities.

## First-time Setup

<!-- TODO: define after selecting the implementation stack. -->

## Daily Commands

<!-- TODO: define after selecting the implementation stack. -->

## Architecture

<!-- TODO: record deployable components and architectural decisions after PRD refinement. -->

## Data Model

<!-- TODO: define after PRD refinement. -->

## Testing

<!-- TODO: define after an implementation plan exists. -->

## Secrets

<!-- TODO: define after selecting integrations. Use Infisical; never hardcode or log secret values. -->

## Deployment

<!-- TODO: hosting target and deployment process are undecided. -->

## Observability

<!-- TODO: define after architecture and hosting decisions. -->

## Specs

Every implementation module must have a backing spec under `docs/specs/` and a `# Spec:` header. Update the relevant spec in the same commit as a behavior change.
