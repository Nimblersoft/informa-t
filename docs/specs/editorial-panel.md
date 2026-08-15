# Spec: Editorial review panel for case A1

## Purpose

This specification defines the architecture, user interaction model, accessibility semantics, and data presentation requirements for the read-only editorial review shell (`informa-t` case A1).

The editorial review shell assists journalists and fact-checking teams in examining electoral claims, primary evidence, and automated analysis. It operates strictly as an auditable decision-support interface. It never produces or publishes autonomous editorial verdicts; human editors retain full editorial authority.

## Data Provenance and Server Single Source of Truth

All case-derived display data rendered across the editorial review panel originate exclusively in the server-side fixture payload returned by `GET /api/demo/cases/a1` and validated through the shared `parseDemoCase` contract:

- **Primary Excerpts**: Delivered via `caseData.excerpts` and rendered in the primary evidence region.
- **Related Context**: Delivered via `caseData.relatedContext` and rendered in the related context region.
- **Analytical Indices**: Delivered via `caseData.indices` and rendered in the `Evidencia` tab.
- **Model Proposals**: Delivered via `caseData.proposals` and rendered in the `Modelos` tab and `Logs` side-by-side view.
- **Pipeline Trace Events**: Delivered via `caseData.traceEvents` and rendered in the `Logs` tab timeline.
- **Auditable Citations**: Delivered via `caseData.citations` and rendered in the `Logs` tab source section.

**Prohibition of Hardcoded Client Constants**:
The client application must not define or consume hardcoded sample constants (`SAMPLE_*`) for case data. All display values must be passed dynamically from the fetched `DemoCase` payload. Automated anti-drift testing guarantees exact parity between the served fixture payload and rendered components without duplicating text assertions.

## Panel Structure and Layout

The interface is structured as a two-column responsive layout:

1. **Header Region**:
   - Brand identifier: `informa-t`.
   - Case identifier: `Caso A1` (`id: "a1"`).
   - Case label: The exact string `Datos sintéticos de desarrollo` retrieved directly from `/api/demo/cases/a1`.
   - Read-only status indicator emphasizing that active verification controls are disabled in review mode.
   - Prohibition: Must not display captured-case badges, verdict selectors, or publish buttons.

2. **Left Column — Extract Stream & Evidence Excerpts (`ExtractStream`)**:
   - Displays selectable primary excerpts extracted from the case.
   - Interactive excerpt selection updates active context and allows deep-linking to trace logs.
   - Provides strict structural separation between **Evidencia primaria** and **Contexto relacionado**.

3. **Right Column — Multi-Tab Analysis Panel (`AnalysisTabs`)**:
   - Houses three tabs: `Evidencia`, `Modelos`, and `Logs`.
   - Follows WAI-ARIA tab pattern with full keyboard navigation.

## Strict Primary vs. Related Evidence Separation

Primary evidence and related contextual material must be housed in separate visual containers and semantic regions:

- **Evidencia primaria (Primary Evidence)**: Direct quotes, speech transcripts, official electoral documents, and verified primary records directly related to the claim.
- **Contexto relacionado (Related Context)**: Background information, historical timelines, and broader contextual framing.
- **Strict Invariance**: Primary evidence and related context must never be interleaved within the same card, list, or container. Each section has its own heading and visual enclosure.

## Tab Semantics and Keyboard Navigation (ARIA)

The tab interface must strictly adhere to WAI-ARIA 1.2 Tabs design pattern:

- **Container**: `role="tablist"` with `aria-label="Secciones de análisis"`.
- **Tab Elements**:
  - `role="tab"`.
  - `id="tab-evidence"`, `id="tab-models"`, `id="tab-logs"`.
  - `aria-controls="panel-evidence"`, `aria-controls="panel-models"`, `aria-controls="panel-logs"`.
  - `aria-selected="true"` for the active tab; `aria-selected="false"` for inactive tabs.
  - `tabindex="0"` for the active tab; `tabindex="-1"` for inactive tabs.
- **Tab Panels**:
  - `role="tabpanel"`.
  - `id="panel-evidence"`, `id="panel-models"`, `id="panel-logs"`.
  - `aria-labelledby="tab-evidence"`, `aria-labelledby="tab-models"`, `aria-labelledby="tab-logs"`.
  - `tabindex="0"` allowing panel content to receive keyboard focus when scrolling.
  - Non-active panels are hidden with `hidden` attribute or unmounted.
- **Keyboard Behavior**:
  - `ArrowRight`: Moves focus and selection to the next tab (wraps to first tab).
  - `ArrowLeft`: Moves focus and selection to the previous tab (wraps to last tab).
  - `Home`: Moves focus and selection to the first tab (`Evidencia`).
  - `End`: Moves focus and selection to the last tab (`Logs`).

## Tab Content Specifications

### 1. Evidencia Tab (`EvidencePanel`)

Displays calculated analytical signals and index metrics for the selected excerpt.

- **Index Contract**:
  - **Name**: Clear descriptive name in Latin American Spanish (e.g., `Consistencia factual`, `Verificabilidad de fuentes`, `Densidad de afirmaciones`, `Claridad contextual`).
  - **Scale & Value**: Integer from 0 through 100 inclusive (e.g., `78 / 100`).
  - **Prohibition on Percentage Signs**: Under no circumstance may a percent symbol (`%`) appear anywhere in the UI or test fixtures.
  - **Rubric**: A concise textual guide describing the score anchors (e.g., `0 = sin soporte demostrable, 100 = respaldo documental completo`).
  - **Justification**: A descriptive paragraph explaining why the score was assigned.
  - **Heuristic Signal Label**: An explicit, visible label stating: `Señal heurística preliminar (no constituye veredicto ni decisión editorial)`.
- **Trace Navigation Action**:
  - An interactive control (e.g., `Ver traza en Logs`) that switches the active tab to `Logs` and scrolls/focuses the corresponding audit event.

### 2. Modelos Tab (`ModelsPanel`)

Presents the multi-agent proposal state from the API.

- **Anonymous Placeholders**:
  - Renders exactly the three proposal placeholders returned by `/api/demo/cases/a1`.
  - Properties: `placeholder: true`, `attributed: false`, message text.
  - Labeling: `Propuesta 1`, `Propuesta 2`, `Propuesta 3` (or generic letters `A`, `B`, `C`).
  - Strictly anonymous: No model names (e.g. GPT, Claude, Gemini, Llama), provider names, or person attributions may be shown.

### 3. Logs Tab (`LogsPanel`)

Provides an auditable timeline of analysis events and comparative proposal breakdown.

- **Stage Filter**:
  - Accessible filter control with `role="radiogroup"` or `<select>` labeled `Filtrar por etapa`.
  - Filter options: `Todas las etapas`, `Ingesta`, `Extracción`, `Análisis`, `Consenso`.
- **Expandable Trace Events**:
  - Individual event cards with toggle button (`aria-expanded="true|false"`).
  - Contains event ID, stage badge, timestamp, description, and canonical hash.
  - Interactive deep-link target: can be programmatically focused and highlighted when navigated from other panels.
- **Side-by-Side Proposal Comparison**:
  - Renders a multi-column comparison of the three anonymous proposals.
  - Compares rationale and status side by side.
  - Must NOT present any 4-verdict legacy classification (e.g. true/false/misleading boxes).
- **Auditable Source Citations**:
  - Citations must include standard HTML anchor links (`<a href="..." target="_blank" rel="noopener noreferrer">`).
  - URLs point to valid auditable primary source locations.

## Performance and Deterministic Clock Contract

- **Mount Fetch**: `/api/demo/cases/a1` is requested once upon component mount.
- **Interactive Readiness**: The UI must achieve an interactive ready state within 2 seconds (2000 ms) of initiation under controlled test conditions.
- **Deterministic Verification**: Testing must verify interactive readiness using deterministic browser clock controls (e.g., Playwright clock APIs or controlled test timers) rather than arbitrary large timeouts.
- **Signal Element**: The root container emits an explicit `data-testid="editorial-shell"` and `data-ready="true"` attribute when the case is loaded and interactive.

## Prohibited UI Elements

1. **No Active Editorial Controls**: No verdict selection dropdowns, publish buttons, editorial sign-off actions, or verdict override controls.
2. **No Percentage Signs (`%`)**: All numeric metrics are expressed strictly as integer ratios (e.g., `78 / 100`) or bare integers on a 0–100 scale.
3. **No 4-Verdict Classifications**: No legacy true/false/misleading/unverifiable verdict badge displays.
4. **No Captured-Case Badges**: No promotional or status badges indicating captured/resolved case state.
5. **No Model or Human Attribution**: No display of commercial AI model names, foundation model providers, or individual contributor names.
6. **No Unredacted Secrets or Chain-of-Thought**: Strictly adherence to trace redaction rules.
