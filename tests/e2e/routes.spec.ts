import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Application routes", () => {
  test("serves the landing page at / with full navigation and pitch sections", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.locator('[data-testid="landing-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("landing-cta-app")).toHaveAttribute("href", "/app");
    await expect(page.getByTestId("hero-launch-app")).toHaveAttribute("href", "/app");
    await expect(page.getByTestId("hero-launch-presentation")).toHaveAttribute("href", "/presentation");
    await expect(page.getByTestId("hero-launch-prototype")).toHaveAttribute("href", "/prototype");
    await expect(page.getByTestId("comparison-table")).toBeVisible();

    // Verify mobile layout without horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator('[data-testid="landing-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);

    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("serves the live URL/text analysis at /app and handles pasted text submission", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/api/analyses", async (route) => {
      requestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: analysis.started\ndata: {\"analysisId\":\"root\",\"textLength\":20,\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[]}\n\nevent: analysis.completed\ndata: {\"analysisId\":\"root\",\"status\":\"failed\",\"claims\":[],\"limitations\":[\"Prueba controlada\"],\"traceEventIds\":[],\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[\"Prueba controlada\"]}\n\n",
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app");

    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toHaveValue(
      "Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.",
    );
    await expect(page.getByTestId("analysis-tabs")).toBeVisible();
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);

    await page.getByTestId("analysis-text-input").fill("Texto pegado suficientemente largo para revisar.");
    await page.getByTestId("analysis-submit").click();

    await expect(page.getByText("Estado: fallido")).toBeVisible();
    expect(requestBody).toEqual({ text: "Texto pegado suficientemente largo para revisar." });
  });

  test("serves the presentation deck at /presentation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/presentation");

    await expect(page.locator(".reveal")).toBeVisible();
    await expect(page.locator(".slides")).toBeVisible();
    await expect(page.getByRole("link", { name: "🚀 Abrir App en Vivo" })).toHaveAttribute("href", "/app");
    await expect(page.getByRole("link", { name: "← Inicio" })).toHaveAttribute("href", "/");
  });

  test("serves the consolidated visual prototype at /prototype without backend APIs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/prototype");

    await expect(page.locator('[data-testid="prototype-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("proto-extract-1")).toBeVisible();
    await expect(page.getByTestId("proto-extract-2")).toBeVisible();
    await expect(page.getByTestId("proto-extract-3")).toBeVisible();

    // Switch variants
    await page.getByTestId("variant-btn-meters").click();
    await expect(page.getByTestId("variant-meters-content")).toBeVisible();

    await page.getByTestId("variant-btn-contrast").click();
    await expect(page.getByTestId("variant-contrast-content")).toBeVisible();

    await page.getByTestId("variant-btn-audit").click();
    await expect(page.getByTestId("variant-audit-content")).toBeVisible();

    // Verdict boundary click
    await page.getByTestId("vbtn-false").click();
    await expect(page.getByTestId("proto-toast")).toBeVisible();

    // Check responsive layout on mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/prototype");
    await expect(page.locator('[data-testid="prototype-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);

    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("keeps the A1 editorial shell at /demo without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true", { timeout: 15000 });
    await expect(page.getByTestId("editorial-decision-container")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toHaveValue(
      "Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.",
    );
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);
  });

  test("retains compact live analysis at /compact", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compact");

    await expect(page.locator('[data-testid="compact-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir revisión completa" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Previsualización extensión de navegador" })).toHaveAttribute("href", "/walkthrough");
    await expect(page.getByRole("link", { name: "Previsualización extensión de navegador" })).toBeVisible();
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);
  });

  test("renders the public walkthrough directly with accessible route actions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/walkthrough");

    await expect(page.getByTestId("walkthrough-shell")).toHaveAttribute("data-ready", "true");
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/walkthrough");

    await expect(page.getByTestId("walkthrough-shell")).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("heading", { name: "Recorrido de la demostración" })).toBeVisible();
    const liveAction = page.getByRole("link", { name: "Iniciar análisis en vivo" });
    await expect(liveAction).toBeVisible();
    await expect(liveAction).toHaveAttribute("href", "/app");
    await expect(page.getByRole("link", { name: "Abrir caso A1 de demostración" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Abrir vista compacta" })).toHaveAttribute("href", "/compact");
    await expect(page.getByText("La decisión editorial no se automatiza")).toBeVisible();
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).resolves.toBe(true);
    await page.keyboard.press("Tab");
    await expect(liveAction).toBeFocused();

    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });
});
