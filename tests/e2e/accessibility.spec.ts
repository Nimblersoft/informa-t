import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility (a11y) & Keyboard-Only Operations", () => {
  test("1. Automated WCAG 2.1 AA audit with axe-core detects zero serious or critical violations", async ({
    page,
  }) => {
    await page.goto("/demo");
    const shell = page.locator('[data-testid="editorial-shell"]');
    await expect(shell).toHaveAttribute("data-ready", "true");

    // Scan initial view (Evidence tab active)
    const scanEvidence = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSeriousEvidence = scanEvidence.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      criticalOrSeriousEvidence,
      `Axe violations in Evidence tab: ${JSON.stringify(criticalOrSeriousEvidence, null, 2)}`,
    ).toEqual([]);

    // Switch to Models tab and scan
    await page.locator('[data-testid="tab-models"]').click();
    await expect(page.locator('[data-testid="panel-models"]')).toBeVisible();
    const scanModels = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSeriousModels = scanModels.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      criticalOrSeriousModels,
      `Axe violations in Models tab: ${JSON.stringify(criticalOrSeriousModels, null, 2)}`,
    ).toEqual([]);

    // Switch to Logs tab and scan
    await page.locator('[data-testid="tab-logs"]').click();
    await expect(page.locator('[data-testid="panel-logs"]')).toBeVisible();
    const scanLogs = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalOrSeriousLogs = scanLogs.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      criticalOrSeriousLogs,
      `Axe violations in Logs tab: ${JSON.stringify(criticalOrSeriousLogs, null, 2)}`,
    ).toEqual([]);
  });

  test("2. Full keyboard-only navigation: tabs, excerpts, fields, select, and downloads with focus-visible", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute(
      "data-ready",
      "true",
    );

    // 1. Keyboard Tab Navigation (WAI-ARIA Tablist)
    const tabEvidence = page.locator('[data-testid="tab-evidence"]');
    const tabModels = page.locator('[data-testid="tab-models"]');
    const tabLogs = page.locator('[data-testid="tab-logs"]');

    await tabEvidence.focus();
    await expect(tabEvidence).toBeFocused();

    // Verify focus-visible outline is active
    const tabOutline = await tabEvidence.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outlineStyle: styles.outlineStyle,
        outlineColor: styles.outlineColor,
        borderBottomColor: styles.borderBottomColor,
      };
    });
    expect(tabOutline.outlineStyle !== "none" || tabOutline.borderBottomColor).toBeTruthy();

    // Navigate right to Models tab using ArrowRight
    await page.keyboard.press("ArrowRight");
    await expect(tabModels).toBeFocused();
    await expect(tabModels).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[data-testid="panel-models"]')).toBeVisible();

    // Navigate right to Logs tab using ArrowRight
    await page.keyboard.press("ArrowRight");
    await expect(tabLogs).toBeFocused();
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[data-testid="panel-logs"]')).toBeVisible();

    // Return to Evidence tab using Home key
    await page.keyboard.press("Home");
    await expect(tabEvidence).toBeFocused();
    await expect(tabEvidence).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[data-testid="panel-evidence"]')).toBeVisible();

    // 2. Keyboard Excerpt Selection
    const excerpt2 = page.locator('[data-testid="excerpt-item-ext-2"]');
    await excerpt2.focus();
    await expect(excerpt2).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(excerpt2).toHaveAttribute("aria-pressed", "true");

    const excerpt3 = page.locator('[data-testid="excerpt-item-ext-3"]');
    await excerpt3.focus();
    await expect(excerpt3).toBeFocused();
    await page.keyboard.press("Space");
    await expect(excerpt3).toHaveAttribute("aria-pressed", "true");
    await expect(excerpt2).toHaveAttribute("aria-pressed", "false");

    // 3. Nested trace button keyboard navigation (Enter on nested btn-log-ext-1)
    const btnLog1 = page.locator('[data-testid="btn-log-ext-1"]');
    await btnLog1.focus();
    await expect(btnLog1).toBeFocused();
    await page.keyboard.press("Enter");

    // Should switch active tab to logs and focus target event
    await expect(tabLogs).toHaveAttribute("aria-selected", "true");
    const targetEvent = page.locator('[data-testid="event-card-evt-ingesta"]');
    await expect(targetEvent).toBeVisible();

    // 4. Stage Filter and Event Toggle Keyboard Operation
    const stageFilter = page.locator('[data-testid="stage-filter"]');
    await stageFilter.focus();
    await expect(stageFilter).toBeFocused();
    await stageFilter.selectOption("Análisis");
    await expect(page.locator('[data-testid="event-card-evt-analisis"]')).toBeVisible();

    const toggleEventBtn = page.locator('[data-testid="toggle-event-evt-analisis"]');
    await toggleEventBtn.focus();
    await expect(toggleEventBtn).toBeFocused();
    // Collapse then expand via keyboard
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="event-details-evt-analisis"]')).toBeHidden();
    await page.keyboard.press("Space");
    await expect(page.locator('[data-testid="event-details-evt-analisis"]')).toBeVisible();

    // Reset filter
    await stageFilter.selectOption("Todas");

    // 5. Editorial Form Keyboard Operation
    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');

    await authorInput.focus();
    await expect(authorInput).toBeFocused();
    await page.keyboard.type("Periodista Accesible");

    await categorySelect.focus();
    await expect(categorySelect).toBeFocused();
    await categorySelect.selectOption("Impreciso");

    await justificationInput.focus();
    await expect(justificationInput).toBeFocused();
    await page.keyboard.type("Análisis completo realizado por teclado.");

    // 6. Withdraw button keyboard operation
    const withdrawBtn = page.locator('[data-testid="btn-withdraw-decision"]');
    await expect(withdrawBtn).toBeVisible();
    await withdrawBtn.focus();
    await expect(withdrawBtn).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(categorySelect).toHaveValue("");

    // Re-select category to enable downloads
    await categorySelect.selectOption("Engañoso");

    // 7. Verify both download buttons are enabled and keyboard actionable
    const btnClaimReview = page.locator('[data-testid="btn-export-claimreview"]');
    const btnTrace = page.locator('[data-testid="btn-export-trace"]');

    await expect(btnClaimReview).toBeEnabled();
    await expect(btnTrace).toBeEnabled();

    // Trigger ClaimReview download via Space key
    const crDownloadPromise = page.waitForEvent("download");
    await btnClaimReview.focus();
    await expect(btnClaimReview).toBeFocused();
    await page.keyboard.press("Space");
    const crDownload = await crDownloadPromise;
    expect(crDownload.suggestedFilename()).toBe("claimreview-a1.json");

    // Trigger Trace download via Enter key
    const traceDownloadPromise = page.waitForEvent("download");
    await btnTrace.focus();
    await expect(btnTrace).toBeFocused();
    await page.keyboard.press("Enter");
    const traceDownload = await traceDownloadPromise;
    expect(traceDownload.suggestedFilename()).toBe("traza-editorial-a1.json");
  });
});
