import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Application routes", () => {
  test("defaults to live URL/text analysis at /", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toHaveValue("Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.");
    await expect(page.getByTestId("analysis-tabs")).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });

  test("submits pasted text from the live default route", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/api/analyses", async (route) => {
      requestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: analysis.started\ndata: {\"analysisId\":\"root\",\"textLength\":20,\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[]}\n\nevent: analysis.completed\ndata: {\"analysisId\":\"root\",\"status\":\"failed\",\"claims\":[],\"limitations\":[\"Prueba controlada\"],\"traceEventIds\":[],\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[\"Prueba controlada\"]}\n\n",
      });
    });

    await page.goto("/");
    await page.getByTestId("analysis-text-input").fill("Texto pegado suficientemente largo para revisar.");
    await page.getByTestId("analysis-submit").click();

    await expect(page.getByText("Estado: fallido")).toBeVisible();
    expect(requestBody).toEqual({ text: "Texto pegado suficientemente largo para revisar." });
  });

  test("keeps the A1 editorial shell at /demo without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("editorial-decision-container")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toHaveValue("Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.");
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });

  test("retains compact live analysis at /compact", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compact");

    await expect(page.locator('[data-testid="compact-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir revisión completa" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Previsualización extensión de navegador" })).toHaveAttribute("href", "/walkthrough");
    await expect(page.getByRole("link", { name: "Previsualización extensión de navegador" })).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });

  test("renders the public walkthrough directly with accessible route actions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/walkthrough");

    await expect(page.getByTestId("walkthrough-shell")).toHaveAttribute("data-ready", "true");
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/walkthrough");

    await expect(page.getByTestId("walkthrough-shell")).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("heading", { name: "Recorrido de la demostración" })).toBeVisible();
    const liveAction = page.getByRole("link", { name: "Iniciar análisis en vivo" });
    await expect(liveAction).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Abrir caso A1 de demostración" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Abrir vista compacta" })).toHaveAttribute("href", "/compact");
    await expect(page.getByText("La decisión editorial no se automatiza")).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
    await page.keyboard.press("Tab");
    await expect(liveAction).toBeFocused();

    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });
});
