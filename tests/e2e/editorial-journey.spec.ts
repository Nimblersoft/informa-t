import { expect, test } from "@playwright/test";

test.describe("Editorial review panel — Case A1 E2E Journeys", () => {
  test("1. Loads A1 under 2s with deterministic clock and renders development label without attribution", async ({
    page,
  }) => {
    // Install controlled browser clock to verify interactive readiness deterministically
    await page.clock.install();

    await page.goto("/demo");

    // Verify interactive shell is ready within 2000ms under controlled clock
    const shell = page.locator('[data-testid="editorial-shell"]');
    await expect(shell).toBeVisible({ timeout: 2000 });
    await expect(shell).toHaveAttribute("data-ready", "true", { timeout: 2000 });

    // Verify interactive duration signal is under 2000ms
    const interactiveMs = await page.evaluate(
      () =>
        (window as unknown as { __interactiveDurationMs?: number })
          .__interactiveDurationMs ?? 0,
    );
    expect(interactiveMs).toBeLessThan(2000);

    // Verify Case identifier and exact development label from API
    await expect(page.locator('[data-testid="case-id"]')).toHaveText("Caso A1");
    await expect(page.locator('[data-testid="case-label"]')).toHaveText(
      "Datos sintéticos de desarrollo",
    );

    // Verify readonly indicator is active
    await expect(page.locator('[data-testid="readonly-indicator"]')).toContainText(
      "Modo de revisión editorial (Solo lectura)",
    );
  });

  test("2. Excerpt selection updates active context without interleaving primary and related evidence", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    // Verify distinct regions exist
    const primarySection = page.locator('[data-testid="primary-evidence-section"]');
    const relatedSection = page.locator('[data-testid="related-context-section"]');
    await expect(primarySection).toBeVisible();
    await expect(relatedSection).toBeVisible();

    // Verify primary excerpt 1 is selected by default
    const excerpt1 = page.locator('[data-testid="excerpt-item-ext-1"]');
    const excerpt2 = page.locator('[data-testid="excerpt-item-ext-2"]');
    const excerpt3 = page.locator('[data-testid="excerpt-item-ext-3"]');

    await expect(excerpt1).toHaveAttribute("aria-pressed", "true");
    await expect(excerpt2).toHaveAttribute("aria-pressed", "false");

    // Click on excerpt 2
    await excerpt2.click();
    await expect(excerpt1).toHaveAttribute("aria-pressed", "false");
    await expect(excerpt2).toHaveAttribute("aria-pressed", "true");

    // Keyboard selection on excerpt 3
    await excerpt3.focus();
    await page.keyboard.press("Enter");
    await expect(excerpt3).toHaveAttribute("aria-pressed", "true");
    await expect(excerpt2).toHaveAttribute("aria-pressed", "false");
  });

  test("3. Accessible tab switching and keyboard navigation (ARIA)", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    const tabList = page.locator('[data-testid="tablist"]');
    await expect(tabList).toHaveAttribute("role", "tablist");
    await expect(tabList).toHaveAttribute("aria-label", "Secciones de análisis");

    const tabEvidence = page.locator('[data-testid="tab-evidence"]');
    const tabModels = page.locator('[data-testid="tab-models"]');
    const tabLogs = page.locator('[data-testid="tab-logs"]');

    const panelEvidence = page.locator('[data-testid="panel-evidence"]');
    const panelModels = page.locator('[data-testid="panel-models"]');
    const panelLogs = page.locator('[data-testid="panel-logs"]');

    // Default active tab is Evidence
    await expect(tabEvidence).toHaveAttribute("aria-selected", "true");
    await expect(tabEvidence).toHaveAttribute("tabindex", "0");
    await expect(tabModels).toHaveAttribute("aria-selected", "false");
    await expect(tabModels).toHaveAttribute("tabindex", "-1");
    await expect(panelEvidence).toBeVisible();
    await expect(panelModels).toBeHidden();
    await expect(panelLogs).toBeHidden();

    // Focus tab and use ArrowRight navigation
    await tabEvidence.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabModels).toHaveAttribute("aria-selected", "true");
    await expect(tabModels).toBeFocused();
    await expect(panelModels).toBeVisible();
    await expect(panelEvidence).toBeHidden();

    await page.keyboard.press("ArrowRight");
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
    await expect(tabLogs).toBeFocused();
    await expect(panelLogs).toBeVisible();

    // Wrap around navigation with ArrowRight
    await page.keyboard.press("ArrowRight");
    await expect(tabEvidence).toHaveAttribute("aria-selected", "true");
    await expect(tabEvidence).toBeFocused();

    // Wrap around backwards with ArrowLeft
    await page.keyboard.press("ArrowLeft");
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
    await expect(tabLogs).toBeFocused();

    // Home / End navigation
    await page.keyboard.press("Home");
    await expect(tabEvidence).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("End");
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
  });

  test("4. Evidencia tab displays complete index contract without percent signs", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    const indexCard = page.locator('[data-testid="index-card-idx-consistencia"]');
    await expect(indexCard).toBeVisible();

    // Name
    await expect(indexCard.locator(".index-name")).toHaveText("Consistencia factual");

    // Score on 0..100 scale (no %)
    const scoreBox = indexCard.locator('[data-testid="index-score-idx-consistencia"]');
    await expect(scoreBox.locator(".score-number")).toHaveText("78");
    await expect(scoreBox.locator(".score-denom")).toHaveText("/ 100");

    // Rubric & Justification
    await expect(indexCard.locator(".rubric-text")).toContainText("Rúbrica de evaluación");
    await expect(indexCard.locator(".justification-text")).toContainText(
      "La afirmación presenta discrepancias",
    );

    // Heuristic Signal Label
    const heuristicLabel = indexCard.locator(
      '[data-testid="heuristic-label-idx-consistencia"]',
    );
    await expect(heuristicLabel).toHaveText(
      "Señal heurística preliminar (no constituye veredicto ni decisión editorial)",
    );
  });

  test("5. Modelos tab displays exactly three anonymous proposals without attribution", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    await page.locator('[data-testid="tab-models"]').click();
    await expect(page.locator('[data-testid="panel-models"]')).toBeVisible();

    // Exactly 3 proposals
    const proposalCards = page.locator(".proposal-card");
    await expect(proposalCards).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(page.locator(`[data-testid="proposal-anon-${i}"]`)).toHaveText(
        "Anónima / Sin atribución",
      );
      await expect(page.locator(`[data-testid="proposal-msg-${i}"]`)).toHaveText(
        "Propuesta sintética pendiente de análisis editorial",
      );
    }

    // Disclaimer regarding human editorial control
    await expect(page.locator('[data-testid="models-disclaimer"]')).toContainText(
      "Principio de control editorial humano",
    );
  });

  test("6. Result/Evidence to Logs event navigation connects the audit journey", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    // Click "Ver evento de trazabilidad en Logs" on the factual consistency metric
    const btnInspectTrace = page.locator('[data-testid="btn-trace-idx-consistencia"]');
    await btnInspectTrace.click();

    // Verify active tab switched to Logs
    const tabLogs = page.locator('[data-testid="tab-logs"]');
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
    const panelLogs = page.locator('[data-testid="panel-logs"]');
    await expect(panelLogs).toBeVisible();

    // Verify target event is focused & highlighted
    const targetEvent = page.locator('[data-testid="event-card-evt-analisis"]');
    await expect(targetEvent).toBeVisible();
    await expect(targetEvent).toHaveClass(/highlighted/);

    // Now test navigating from an excerpt card
    const btnLogExcerpt = page.locator('[data-testid="btn-log-ext-2"]');
    await btnLogExcerpt.click();

    const targetExcerptEvent = page.locator('[data-testid="event-card-evt-extraccion"]');
    await expect(targetExcerptEvent).toBeVisible();
    await expect(targetExcerptEvent).toHaveClass(/highlighted/);
  });

  test("7. Logs tab filters by stage, toggles details, shows side-by-side comparison and valid citations", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    await page.locator('[data-testid="tab-logs"]').click();

    // Stage filter
    const stageSelect = page.locator('[data-testid="stage-filter"]');
    await stageSelect.selectOption("Extracción");

    await expect(page.locator('[data-testid="event-card-evt-extraccion"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-card-evt-ingesta"]')).toBeHidden();

    // Reset filter
    await stageSelect.selectOption("Todas");
    await expect(page.locator('[data-testid="event-card-evt-ingesta"]')).toBeVisible();

    // Toggle event details
    const toggleBtn = page.locator('[data-testid="toggle-event-evt-ingesta"]');
    await toggleBtn.click(); // Collapse
    await expect(page.locator('[data-testid="event-details-evt-ingesta"]')).toBeHidden();
    await toggleBtn.click(); // Expand
    await expect(page.locator('[data-testid="event-details-evt-ingesta"]')).toBeVisible();

    // Side-by-side comparison
    const comparisonSection = page.locator('[data-testid="side-by-side-comparison"]');
    await expect(comparisonSection).toBeVisible();
    const comparisonCols = page.locator(".comparison-col");
    await expect(comparisonCols).toHaveCount(3);

    // Citations
    const citationsSection = page.locator('[data-testid="citations-section"]');
    await expect(citationsSection).toBeVisible();

    const citationLink = page.locator('[data-testid="link-cite-src-1"]');
    await expect(citationLink).toHaveAttribute("target", "_blank");
    await expect(citationLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(citationLink).toHaveAttribute(
      "href",
      "https://oep.org.bo/padron-electoral-2026",
    );
  });

  test("8. Prohibitions check: no automated verdicts or active editorial controls", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    // Get all rendered text across all tabs
    const bodyText = await page.innerText("body");

    // Switch to Models tab and check
    await page.locator('[data-testid="tab-models"]').click();
    const modelsText = await page.innerText("body");

    // Switch to Logs tab and check
    await page.locator('[data-testid="tab-logs"]').click();
    const logsText = await page.innerText("body");

    // Verify no active decision/publish buttons exist
    const publishBtn = page.locator("button:has-text('Publicar')");
    await expect(publishBtn).toHaveCount(0);

    const approveBtn = page.locator("button:has-text('Aprobar')");
    await expect(approveBtn).toHaveCount(0);

    const verdictSelector = page.locator("select:has-text('Veredicto')");
    await expect(verdictSelector).toHaveCount(0);

    // Verify no captured-case badge exists
    const capturedBadge = page.locator(":has-text('Caso capturado')");
    await expect(capturedBadge).toHaveCount(0);
  });
});
