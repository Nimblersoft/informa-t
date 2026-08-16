# informa-t - Agent Guide

informa-t is a proposed MediaHack II MVP for journalists and fact-checking teams to investigate electoral-information claims against auditable primary sources. It assists analysis and evidence tracing; an editor retains every public verification decision.

> [!NOTE]
> `prototype/index.html` is an exploratory, non-productive visual reference only. The functional and accessible implementation resides under `src/` and is served via Vite + React.

> [!WARNING]
> `AGENTS.md` is the agent-context SSOT. Domain terminology belongs in [CONTEXT.md](CONTEXT.md); decisions in `docs/adr/`; specifications in `docs/specs/`. Filing rules: [docs/docs-organization-blueprint.md](docs/docs-organization-blueprint.md).

## Layout

```
AGENTS.md                         agent working context
CLAUDE.md                         pointer to AGENTS.md
CONTEXT.md                        domain glossary
README.md                         human-facing overview
docs/index.md                     documentation map
docs/specs/accessibility-shell.md accessibility and responsive spec
docs/specs/editorial-decision.md  editorial boundary and export spec
docs/specs/editorial-panel.md     case A1 review panel spec
docs/specs/mediahack-prd-draft.md supplied MVP PRD draft
docs/adr/                         future architectural decisions
src/client/                       React client shell and components
src/server/                       Hono backend API routes and handlers
src/shared/                       TypeScript contracts, schemas, and helpers
tests/                            Vitest unit tests and Playwright e2e suites
```

## Current Scope

- Functional editorial review shell for Case A1 with full keyboard accessibility, responsive layout (1440×900 and 390×844), auditable evidence tracing, and human decision exports.
- Hackathon reference: [NotebookLM](https://notebook.google.com/notebook/6745369c-5e1f-4662-9f97-2bc751cc7e40). Query it through NotebookLM MCP or CLI when interpreting rules and priorities.
- Team ideation scratch space: [Google Doc](https://docs.google.com/document/d/1tGYZESz2_R-wdWekXdu9wwhg4QKUGBKB-r0fIffOqbg/edit). It is input, not an authoritative product contract.

## Product Guardrails

- **Human editorial control.** Never emit or publish an autonomous true/false verdict; a journalist makes the editorial decision.
- **Auditable evidence.** Analysis must trace claims to cited, linkable primary sources so a journalist can reproduce the review.
- **Political neutrality and privacy.** Apply equivalent treatment across political actors; do not profile citizens by political views or retain unnecessary personal data.
- **Narrow MVP.** Prioritize a working, live-demonstrable evidence flow over broad or forensic capabilities.

## Language

- Write product documentation and all user-visible UI text in Latin American Spanish.
- Keep agent-only context (`AGENTS.md`, `CONTEXT.md`, and `CLAUDE.md`) and source code in English.

## First-time Setup

```bash
# Install dependencies
npm install
```

## Daily Commands

```bash
# Start local development server
npm run dev

# Typecheck TypeScript files
npm run typecheck

# Build client and server bundles
npm run build

# Run all tests (Vitest unit tests + Playwright e2e)
npm test

# Run unit tests only
npm run test:unit

# Run end-to-end tests only
npm run test:e2e
```

## Architecture

The project is structured as a full-stack TypeScript application:
- **Client (`src/client/`)**: React 19 single-page editorial shell with WAI-ARIA accessible tabs, keyboard navigation, ClaimReview JSON-LD and audit trace exports, and responsive CSS tokens.
- **Server (`src/server/`)**: Hono-based API providing demo case data (`GET /api/demo/cases/a1`), schema validation, and health endpoints.
- **Shared (`src/shared/`)**: Domain contracts, validation parsers, ClaimReview generator, and consensus calculation helpers.

## Data Model

Case data and editorial models are strongly typed in `src/shared/contracts.ts` and `src/shared/claim-review.ts`:
- `DemoCase`: Root fixture contract containing excerpts, related context, analytical indices, synthetic proposals, trace events, and citations.
- `ClaimReviewJsonLd`: Schema.org compliant `ClaimReview` output payload.
- `EditorialTraceExport`: Inmutable audit log of user editorial events during a verification session.

## Testing

The automated test suite guarantees zero regressions across contracts, business logic, accessibility, and viewports:
- **Unit & Integration tests (`tests/*.test.ts*`)**: Run with Vitest and `@testing-library/react`. Covers contract parsing, consensus calculation, trace integrity, and component behavior.
- **End-to-End tests (`tests/e2e/*.spec.ts`)**: Run with Playwright (Chromium). Covers end-to-end editorial journeys (`editorial-journey.spec.ts`), editorial decision state machine (`editorial.spec.ts`), WCAG 2.1 AA audits and keyboard nav (`accessibility.spec.ts`), and responsive viewports (`responsive.spec.ts`).

## Secrets

Use Infisical; never hardcode or log secret values.

## Deployment

Target runtime is Cloudflare Workers with Vite / Static Asset bindings configured in `wrangler.jsonc`.

## Observability

Structured trace events (`TraceEvent`) and audit logs provide deterministic traceability with SHA-256 canonical hashing across ingestion, extraction, analysis, and consensus stages. Extractor decisions are retained for seven days in the private `AUDIT_DB` D1 binding; the application never stores full source bodies or exposes an audit-read endpoint. The hourly Cron Trigger removes expired rows.

## Specs

Every implementation module must have a backing spec under `docs/specs/` and a `# Spec:` header. Update the relevant spec in the same commit as a behavior change.
