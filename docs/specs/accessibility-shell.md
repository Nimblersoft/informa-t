# Spec: Accessibility and Responsive Architecture of the Editorial Shell

## Purpose

This specification defines the accessibility (a11y) architecture, keyboard navigation map, contrast targets, responsive viewport behaviors, and end-to-end verification requirements for the `informa-t` case A1 editorial review shell.

The interface assists journalists and fact-checking teams in examining electoral claims, primary evidence, and automated analysis against auditable primary sources while retaining exclusive human editorial authority. To support all operators, the shell must be fully navigable via keyboard, screen readers, and assistive technologies without horizontal scrolling or layout degradation across standard desktop and mobile viewports.

## Semantic Regions and Hierarchy

The application layout is divided into distinct, non-overlapping semantic regions structured with semantic HTML5 landmarks and WAI-ARIA attributes:

1. **Header Landmark (`<header className="app-header">`)**:
   - `<h1>` element presenting the brand name `informa-t`.
   - Case identifier badge (`Caso A1`) and case status badge (`Datos sintéticos de desarrollo`).
   - Read-only indicator (`Modo de revisión editorial (Solo lectura)`).

2. **Main Landmark (`<main className="editorial-main-content">`)**:
   - Contains the primary workspace arranged in a two-column grid on desktop and vertically stacked on mobile.

3. **Left Region — Evidence Extract Stream (`<section aria-label="Panel de extractos y evidencia">`)**:
   - **Primary Evidence Section (`<div data-testid="primary-evidence-section">`)**:
     - Heading `<h3>` "Evidencia primaria".
     - List of interactive primary excerpts (`role="list"`).
     - Each primary excerpt is an interactive card (`<article role="button" tabIndex={0} aria-pressed="true|false">` or accessible interactive button element) with an explicit accessible label (e.g., `aria-label="Extracto 1: ..."`).
     - Nested trace link action (`<button type="button" className="btn-link-log">Ver traza</button>`) with independent keyboard operability and click event stopping propagation.
   - **Related Context Section (`<div data-testid="related-context-section">`)**:
     - Heading `<h3>` "Contexto relacionado".
     - Strictly separated from primary excerpts; displays reference metadata and descriptions in accessible cards.

4. **Right Region — Multi-Tab Analysis Panel (`<div data-testid="analysis-tabs">`)**:
   - **Tab Navigation Bar (`<div role="tablist" aria-label="Secciones de análisis">`)**:
     - Three tabs (`role="tab"`): `Evidencia` (`#tab-evidence`), `Modelos` (`#tab-models`), and `Logs` (`#tab-logs`).
     - Follows WAI-ARIA 1.2 Tabs design pattern: active tab has `aria-selected="true"` and `tabIndex={0}`; inactive tabs have `aria-selected="false"` and `tabIndex={-1}`.
   - **Tab Panels (`<div role="tabpanel">`)**:
     - `EvidencePanel` (`#panel-evidence`, `aria-labelledby="tab-evidence"`, `tabIndex={0}`). Contains analytical index cards and trace link buttons (`.btn-inspect-trace`).
     - `ModelsPanel` (`#panel-models`, `aria-labelledby="tab-models"`, `tabIndex={0}`). Displays anonymous multi-agent proposals without attribution.
     - `LogsPanel` (`#panel-logs`, `aria-labelledby="tab-logs"`, `tabIndex={0}`). Contains stage filter `<select>` with `<label>`, audit event timeline cards with expand/collapse buttons (`aria-expanded`, `aria-controls`), side-by-side proposal comparison columns, and primary source citation cards with external links (`target="_blank"`, `rel="noopener noreferrer"`).

5. **Bottom Region — Human Editorial Decision Boundary (`<section aria-labelledby="editorial-decision-heading">`)**:
   - Heading `<h2>` "Decisión editorial humana".
   - Form `<form data-testid="editorial-decision-form">` containing:
     - Author input (`#editorial-author-input`) with associated `<label htmlFor="editorial-author-input">` and `aria-required="true"`.
     - Category select (`#editorial-category-select`) with associated `<label htmlFor="editorial-category-select">`, `aria-required="true"`, and optional withdraw button (`[data-testid="btn-withdraw-decision"]`).
     - Justification textarea (`#editorial-justification-input`) with associated `<label htmlFor="editorial-justification-input">` and `aria-required="true"`.
     - Status summary banner (`role="status"`).
     - Export action buttons (`btn-export-claimreview`, `btn-export-trace`) with `aria-disabled` reflect readiness.
     - Trace history toggle button (`aria-expanded`, `aria-controls="editorial-trace-viewer"`) and expandable audit trace history list.

## Keyboard Interaction Map

All interactive elements must be reachable and actionable using standard keyboard patterns:

| Component / Element | Target Keys | Expected Action |
| :--- | :--- | :--- |
| **Analysis Tabs** (`[role="tab"]`) | `ArrowRight` / `ArrowDown` | Move focus and selection to next tab (cycles from Logs to Evidencia). |
| | `ArrowLeft` / `ArrowUp` | Move focus and selection to previous tab (cycles from Evidencia to Logs). |
| | `Home` | Move focus and selection to first tab (`Evidencia`). |
| | `End` | Move focus and selection to last tab (`Logs`). |
| | `Tab` | Move focus into active tabpanel or next interactive control. |
| **Primary Excerpt Cards** (`[data-testid^="excerpt-item-"]`) | `Enter` / `Space` | Select excerpt, set `aria-pressed="true"`, update active excerpt context. |
| **Trace Button in Excerpt** (`[data-testid^="btn-log-"]`) | `Enter` / `Space` | Switch active tab to `Logs`, scroll and focus target trace event card without re-toggling excerpt. |
| **Trace Button in Index Card** (`[data-testid^="btn-trace-"]`) | `Enter` / `Space` | Switch active tab to `Logs`, scroll and focus target audit event card. |
| **Stage Filter Select** (`[data-testid="stage-filter"]`) | `ArrowUp` / `ArrowDown` / `Enter` | Filter audit timeline events by selected stage. |
| **Event Toggle Details** (`[data-testid^="toggle-event-"]`) | `Enter` / `Space` | Toggle expansion of event technical details (`aria-expanded`). |
| **Audit Event Cards** (`[data-testid^="event-card-"]`) | `Tab` | Receive focus when highlighted/inspected via programmatic trace jump. |
| **Primary Source Links** (`[data-testid^="link-cite-"]`) | `Enter` | Open primary source in new browser tab (`target="_blank"`). |
| **Editorial Author Input** (`[data-testid="editorial-author-input"]`) | Typing | Enter journalist/editor identity. |
| **Editorial Category Select** (`[data-testid="editorial-category-select"]`) | `ArrowUp` / `ArrowDown` / `Enter` | Select canonical verification category. |
| **Withdraw Button** (`[data-testid="btn-withdraw-decision"]`) | `Enter` / `Space` | Withdraw current category decision, reset selector. |
| **Justification Textarea** (`[data-testid="editorial-justification-input"]`) | Typing | Enter editorial reasoning and evidence synthesis. |
| **Export ClaimReview Button** (`[data-testid="btn-export-claimreview"]`) | `Enter` / `Space` | Trigger download of `claimreview-a1.json` when enabled. |
| **Export Trace Button** (`[data-testid="btn-export-trace"]`) | `Enter` / `Space` | Trigger download of `traza-editorial-a1.json` when enabled. |
| **Trace History Toggle** (`[data-testid="btn-toggle-trace-history"]`) | `Enter` / `Space` | Toggle local audit trace viewer panel visibility. |

## Focus Visibility and Accessible Names

1. **Focus Ring Visibility**:
   - All interactive controls (`button`, `input`, `select`, `textarea`, `a`, `[role="tab"]`, `[tabIndex="0"]`) must present a distinct visual focus indicator under `:focus-visible`.
   - Focus outline rule: `outline: 2px solid var(--brand-primary); outline-offset: 2px;`.
   - On dark surfaces (`#0b0f19`, `#111827`, `#1f2937`), the sky-blue focus ring (`#38bdf8`) produces a high contrast ratio exceeding 7:1.

2. **Accessible Names (WCAG 4.1.2)**:
   - Every interactive control must have a discernible, non-empty accessible name via visible text, explicit `<label htmlFor="...">`, or `aria-label`/`aria-labelledby`.
   - Form inputs must be unambiguously associated with their labels.
   - Icon-only or link buttons must include explicit action descriptions in Spanish.

## Visual Identity and Contrast Targets (WCAG 2.1 AA)

The shell uses a restrained light editorial palette: an off-white canvas (`#f6f8fb`), white work surfaces, slate body text, and deep blue action and provenance cues. Evidence, audit/provenance, progress, and the human decision boundary use distinct top edges, descriptive labels, and spacing rather than decorative density. This follows the visual-design source's hierarchy, whitespace, high-contrast, descriptive-link, and simple-cue guidance.

All visual elements must adhere to WCAG AA color contrast thresholds:

1. **Normal Text (< 18pt regular or < 14pt bold)**: Minimum contrast ratio of **4.5:1** against adjacent background.
    - Primary text (`#172033` on `#ffffff`): > 15:1 (PASS).
    - Secondary text (`#475569` on `#ffffff`): > 7:1 (PASS).
    - Muted text (`#526477` on `#ffffff`): > 5:1 (PASS).
2. **Large Text (>= 18pt or >= 14pt bold) & UI Components / Indicators**: Minimum contrast ratio of **3.0:1**.
    - Focus ring and primary action (`#075985`): > 7:1 against white (PASS).
    - State text uses dark semantic accents (Emerald `#047857`, Amber `#92400e`, Indigo `#3730a3`, Rose `#be123c`) on their pale state surfaces.
    - Input borders and card boundaries use `--border-strong` (`#9aaabd`) and the deep-blue `--border-focus` (`#075985`).

## Responsive Viewport Expectations

The editorial shell must provide an uninterrupted experience across all target viewports, specifically:

### 1. Desktop Viewport (1440 × 900)
- Two-column grid layout: `grid-template-columns: 440px minmax(0, 1fr)` with 1.5rem gap.
- Extract Stream on the left, Analysis Tabs on the right.
- Editorial Decision panel spans full container width beneath the grid.
- No horizontal scrolling: `document.documentElement.scrollWidth <= window.innerWidth`.

### 2. Mobile Viewport (390 × 844)
- Single-column stacked layout:
  - Header with wrapped/stacked brand and metadata badges.
  - Left column (`ExtractStream`) vertically stacked above the right column (`AnalysisTabs`).
  - Editorial Decision section stacked beneath the tab panels.
  - Form rows collapse from 2-column to 1-column.
  - Card grids (`indices-grid`, `proposals-grid`, `proposals-comparison-columns`) collapse to single-column with `min-width: 0`.
  - Canonical hashes and long strings wrap/break gracefully (`word-break: break-all; overflow-wrap: anywhere`).
  - No horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`.

## Test Plan

Verification of accessibility and responsive requirements is implemented via automated test suites:

1. **`tests/e2e/accessibility.spec.ts`**:
   - Keyboard-only navigation journey executing tab switching (`ArrowRight`, `ArrowLeft`, `Home`, `End`), excerpt selection (`Enter`, `Space`), nested trace jumps, form field input and category selection, decision withdrawal, and export execution.
   - Visible focus state assertions for interactive controls under `:focus-visible`.
   - Automated axe-core accessibility scanner (`@axe-core/playwright`) verifying zero serious or critical WCAG 2.1 AA violations on the initialized shell and across all tab views.

2. **`tests/e2e/responsive.spec.ts`**:
   - Viewport tests at 1440×900 and 390×844 asserting `scrollWidth <= clientWidth` on `document.documentElement` and `document.body`.
   - Mobile vertical stacking order verification: asserts that the primary evidence region, analysis tabs, and editorial decision section appear in correct vertical sequence without visual or DOM overlap.
   - Screenshot artifact captures for visual record.

## Live Analysis Routes (`/`, `/demo`, `/compact`)

The live analysis interface is the default route at `/`. It accepts a public-news URL or pasted text and reuses the SSE analysis client for progress, extracted atomic claims, linkable primary evidence, non-binding model availability/comparison, trace identifiers, and degradation or failure messages. The static Case A1 editorial review shell is available at `/demo`; `/compact` is the small-window presentation of the same live analysis flow.

All three routes must:

- Preserve the human editorial boundary and never select, infer, or publish a true/false decision from model output.
- Keep every control keyboard operable with visible focus and maintain `scrollWidth <= clientWidth` at 390×844.
- Never inspect browser tabs or history, collect browsing data, or profile people.

The route contract is explicit:

- `/` renders the URL/text input-led live analysis experience by default.
- `/demo` renders the read-only A1 shell and its audit workflow.
- `/compact` renders the compact live analysis experience and links to `/demo` for the full A1 review.

Route verification is covered by `tests/compact-analysis.test.tsx`, `tests/e2e/routes.spec.ts`, and `tests/e2e/compact.spec.ts`, including direct route loading, text and URL request shapes, serious/critical axe checks, and narrow-viewport overflow.
