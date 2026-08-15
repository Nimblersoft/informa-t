import { expect, test } from "@playwright/test";

test.describe("Responsive Viewports & Overflow Verification", () => {
  test("1. Desktop viewport (1440x900): Two-column layout with zero horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/demo");

    const shell = page.locator('[data-testid="editorial-shell"]');
    await expect(shell).toHaveAttribute("data-ready", "true");

    // Zero horizontal overflow assertion on desktop
    const overflowMetrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      return {
        docScrollWidth: docEl.scrollWidth,
        docClientWidth: docEl.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        windowInnerWidth: window.innerWidth,
      };
    });

    expect(
      overflowMetrics.docScrollWidth,
      `Desktop docEl horizontal overflow: scrollWidth (${overflowMetrics.docScrollWidth}) > clientWidth (${overflowMetrics.docClientWidth})`,
    ).toBeLessThanOrEqual(overflowMetrics.docClientWidth);

    expect(
      overflowMetrics.bodyScrollWidth,
      `Desktop body horizontal overflow: scrollWidth (${overflowMetrics.bodyScrollWidth}) > clientWidth (${overflowMetrics.bodyClientWidth})`,
    ).toBeLessThanOrEqual(overflowMetrics.bodyClientWidth);

    // Verify two-column grid layout at 1440px
    const extractStream = page.locator('[data-testid="extract-stream"]');
    const analysisTabs = page.locator('[data-testid="analysis-tabs"]');
    const decisionSection = page.locator('[data-testid="editorial-decision-container"]');

    await expect(extractStream).toBeVisible();
    await expect(analysisTabs).toBeVisible();
    await expect(decisionSection).toBeVisible();

    const streamBox = await extractStream.boundingBox();
    const tabsBox = await analysisTabs.boundingBox();
    const decisionBox = await decisionSection.boundingBox();

    expect(streamBox).not.toBeNull();
    expect(tabsBox).not.toBeNull();
    expect(decisionBox).not.toBeNull();

    if (streamBox && tabsBox && decisionBox) {
      // In 2-column layout, stream is on the left of tabs (streamBox.x < tabsBox.x)
      expect(streamBox.x).toBeLessThan(tabsBox.x);
      // Both columns start near top
      expect(Math.abs(streamBox.y - tabsBox.y)).toBeLessThan(50);
      // Decision section is below both
      expect(decisionBox.y).toBeGreaterThan(streamBox.y);
    }

    // Capture screenshot artifact for desktop
    await page.screenshot({
      path: "test-results/responsive-1440x900.png",
      fullPage: true,
    });
  });

  test("2. Mobile viewport (390x844): Vertically stacked semantic regions with zero horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    const shell = page.locator('[data-testid="editorial-shell"]');
    await expect(shell).toHaveAttribute("data-ready", "true");

    // Zero horizontal overflow assertion on mobile
    const overflowMetrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      return {
        docScrollWidth: docEl.scrollWidth,
        docClientWidth: docEl.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        windowInnerWidth: window.innerWidth,
      };
    });

    expect(
      overflowMetrics.docScrollWidth,
      `Mobile docEl horizontal overflow: scrollWidth (${overflowMetrics.docScrollWidth}) > clientWidth (${overflowMetrics.docClientWidth})`,
    ).toBeLessThanOrEqual(overflowMetrics.docClientWidth);

    expect(
      overflowMetrics.bodyScrollWidth,
      `Mobile body horizontal overflow: scrollWidth (${overflowMetrics.bodyScrollWidth}) > clientWidth (${overflowMetrics.bodyClientWidth})`,
    ).toBeLessThanOrEqual(overflowMetrics.bodyClientWidth);

    // Verify vertical stacking order: ExtractStream -> AnalysisTabs -> EditorialDecision
    const extractStream = page.locator('[data-testid="extract-stream"]');
    const analysisTabs = page.locator('[data-testid="analysis-tabs"]');
    const decisionSection = page.locator('[data-testid="editorial-decision-container"]');

    await expect(extractStream).toBeVisible();
    await expect(analysisTabs).toBeVisible();
    await expect(decisionSection).toBeVisible();

    const streamBox = await extractStream.boundingBox();
    const tabsBox = await analysisTabs.boundingBox();
    const decisionBox = await decisionSection.boundingBox();

    expect(streamBox).not.toBeNull();
    expect(tabsBox).not.toBeNull();
    expect(decisionBox).not.toBeNull();

    if (streamBox && tabsBox && decisionBox) {
      // On mobile, elements are stacked vertically in DOM order
      expect(streamBox.y).toBeLessThan(tabsBox.y);
      expect(tabsBox.y).toBeLessThan(decisionBox.y);
      // Both columns span across the mobile width starting near left edge
      expect(streamBox.x).toBeLessThan(50);
      expect(tabsBox.x).toBeLessThan(50);
    }

    // Check tabs in mobile viewport
    await page.locator('[data-testid="tab-models"]').click();
    await expect(page.locator('[data-testid="panel-models"]')).toBeVisible();

    const modelsOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(modelsOverflow).toBe(true);

    await page.locator('[data-testid="tab-logs"]').click();
    await expect(page.locator('[data-testid="panel-logs"]')).toBeVisible();

    const logsOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(logsOverflow).toBe(true);

    // Capture screenshot artifact for mobile
    await page.screenshot({
      path: "test-results/responsive-390x844.png",
      fullPage: true,
    });
  });
});
