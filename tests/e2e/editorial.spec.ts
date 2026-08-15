import { expect, test } from "@playwright/test";

test.describe("Human Editorial Decision Boundary & Export Journeys", () => {
  test("1. Initial state: Editorial boundary starts empty, exports disabled, no automated pre-population", async ({
    page,
  }) => {
    await page.goto("/");
    const shell = page.locator('[data-testid="editorial-shell"]');
    await expect(shell).toHaveAttribute("data-ready", "true");

    const decisionContainer = page.locator('[data-testid="editorial-decision-container"]');
    await expect(decisionContainer).toBeVisible();

    // Verify fields start completely empty
    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');

    await expect(authorInput).toHaveValue("");
    await expect(categorySelect).toHaveValue("");
    await expect(justificationInput).toHaveValue("");

    // Verify export buttons are disabled
    const btnClaimReview = page.locator('[data-testid="btn-export-claimreview"]');
    const btnTrace = page.locator('[data-testid="btn-export-trace"]');
    await expect(btnClaimReview).toBeDisabled();
    await expect(btnTrace).toBeDisabled();

    // Verify withdraw button is not present initially
    await expect(page.locator('[data-testid="btn-withdraw-decision"]')).toHaveCount(0);

    // Validation hint is shown
    await expect(page.locator('[data-testid="editorial-validation-msg"]')).toBeVisible();
  });

  test("2. Export gating: strictly requires author, category, and non-whitespace justification", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");

    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');
    const btnClaimReview = page.locator('[data-testid="btn-export-claimreview"]');
    const btnTrace = page.locator('[data-testid="btn-export-trace"]');

    // Only author -> exports still disabled
    await authorInput.fill("María González");
    await expect(btnClaimReview).toBeDisabled();
    await expect(btnTrace).toBeDisabled();

    // Author + category -> exports still disabled
    await categorySelect.selectOption("Impreciso");
    await expect(btnClaimReview).toBeDisabled();
    await expect(btnTrace).toBeDisabled();

    // Author + category + whitespace-only justification -> exports still disabled
    await justificationInput.fill("   \n   ");
    await expect(btnClaimReview).toBeDisabled();
    await expect(btnTrace).toBeDisabled();

    // Author + category + valid justification -> exports become enabled!
    await justificationInput.fill(
      "La declaración mezcla datos preliminares no consolidados con cifras oficiales del padrón electoral.",
    );
    await expect(btnClaimReview).toBeEnabled();
    await expect(btnTrace).toBeEnabled();

    // Success ready message appears
    await expect(page.locator('[data-testid="editorial-ready-msg"]')).toBeVisible();
    await expect(page.locator('[data-testid="editorial-validation-msg"]')).toHaveCount(0);
  });

  test("3. State machine and event lifecycle: select, change, and withdraw create distinct events", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");

    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');

    await authorInput.fill("Editor Test");
    await justificationInput.fill("Justificación de prueba para trazabilidad.");

    // 1. Selection (Empty -> Cierto)
    await categorySelect.selectOption("Cierto");
    const withdrawBtn = page.locator('[data-testid="btn-withdraw-decision"]');
    await expect(withdrawBtn).toBeVisible();

    // 2. Change (Cierto -> Impreciso)
    await categorySelect.selectOption("Impreciso");

    // 3. Withdraw (Impreciso -> Empty)
    await withdrawBtn.click();
    await expect(categorySelect).toHaveValue("");
    await expect(withdrawBtn).toHaveCount(0);

    // 4. Re-selection (Empty -> Engañoso)
    await categorySelect.selectOption("Engañoso");

    // Open trace viewer
    const toggleTraceBtn = page.locator('[data-testid="btn-toggle-trace-history"]');
    await toggleTraceBtn.click();

    const traceViewer = page.locator('[data-testid="editorial-trace-viewer"]');
    await expect(traceViewer).toBeVisible();

    const eventItems = page.locator(".trace-event-entry");
    await expect(eventItems).toHaveCount(4);

    // Verify all 4 event types are rendered with appropriate badges
    await expect(eventItems.nth(0)).toHaveClass(/event-type-selected/);
    await expect(eventItems.nth(0)).toContainText("selected");
    await expect(eventItems.nth(0)).toContainText("Cierto");

    await expect(eventItems.nth(1)).toHaveClass(/event-type-changed/);
    await expect(eventItems.nth(1)).toContainText("changed");
    await expect(eventItems.nth(1)).toContainText("Impreciso");

    await expect(eventItems.nth(2)).toHaveClass(/event-type-withdrawn/);
    await expect(eventItems.nth(2)).toContainText("withdrawn");

    await expect(eventItems.nth(3)).toHaveClass(/event-type-selected/);
    await expect(eventItems.nth(3)).toContainText("selected");
    await expect(eventItems.nth(3)).toContainText("Engañoso");
  });

  test("4. ClaimReview JSON-LD export download and structure verification", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");

    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');
    const btnClaimReview = page.locator('[data-testid="btn-export-claimreview"]');

    const expectedAuthor = "Carlos Mendoza (Editor Electoral)";
    const expectedCategory = "Impreciso";
    const expectedJustification =
      "El incremento del padrón no ocurrió en dos meses según el reporte oficial del TSE.";

    await authorInput.fill(expectedAuthor);
    await categorySelect.selectOption(expectedCategory);
    await justificationInput.fill(expectedJustification);

    await expect(btnClaimReview).toBeEnabled();

    // Trigger and capture download
    const downloadPromise = page.waitForEvent("download");
    await btnClaimReview.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("claimreview-a1.json");

    // Read and parse downloaded JSON-LD file
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error("No download stream available");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const content = Buffer.concat(chunks).toString("utf-8");
    const jsonLd = JSON.parse(content);

    // Validate Schema.org ClaimReview
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("ClaimReview");
    expect(jsonLd.author).toEqual({
      "@type": "Person",
      name: expectedAuthor,
    });
    expect(jsonLd.reviewRating).toEqual({
      "@type": "Rating",
      ratingValue: 3,
      bestRating: 5,
      worstRating: 1,
      alternateName: expectedCategory,
    });
    expect(jsonLd.reviewBody).toBe(expectedJustification);

    // Multiple claims structured under hasPart
    expect(jsonLd.hasPart).toBeDefined();
    expect(Array.isArray(jsonLd.hasPart)).toBe(true);
    expect(jsonLd.hasPart.length).toBeGreaterThan(0);
    expect(jsonLd.hasPart[0]["@type"]).toBe("Claim");
    expect(jsonLd.hasPart[0].name).toBeTruthy();
    expect(jsonLd.hasPart[0].text).toBeTruthy();
  });

  test("5. Editorial trace JSON export download and audit events verification", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");

    const authorInput = page.locator('[data-testid="editorial-author-input"]');
    const categorySelect = page.locator('[data-testid="editorial-category-select"]');
    const justificationInput = page.locator('[data-testid="editorial-justification-input"]');
    const btnTrace = page.locator('[data-testid="btn-export-trace"]');

    const expectedAuthor = "Laura Silva (Fact-Checker)";
    await authorInput.fill(expectedAuthor);
    await justificationInput.fill("Justificación inicial.");

    // Perform select, change, withdraw, select cycle
    await categorySelect.selectOption("Cierto");
    await categorySelect.selectOption("Falso");
    await page.locator('[data-testid="btn-withdraw-decision"]').click();
    await categorySelect.selectOption("Sátira");

    await expect(btnTrace).toBeEnabled();

    // Trigger and capture download
    const downloadPromise = page.waitForEvent("download");
    await btnTrace.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("traza-editorial-a1.json");

    // Read and parse downloaded trace file
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error("No download stream available");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const content = Buffer.concat(chunks).toString("utf-8");
    const traceJson = JSON.parse(content);

    // Validate trace structure
    expect(traceJson.exportType).toBe("informa-t.editorial-trace");
    expect(traceJson.schemaVersion).toBe("1.0.0");
    expect(traceJson.caseId).toBe("a1");
    expect(traceJson.exportTimestamp).toBeTruthy();
    expect(traceJson.currentDecision).toEqual({
      author: expectedAuthor,
      category: "Sátira",
      justification: "Justificación inicial.",
      isExportReady: true,
    });

    // Validate event history has the 4 transitions
    expect(traceJson.events).toHaveLength(4);
    expect(traceJson.events.map((e: { type: string }) => e.type)).toEqual([
      "selected",
      "changed",
      "withdrawn",
      "selected",
    ]);
  });
});
