import { expect, test } from "@playwright/test";

test.describe("Application routes", () => {
  test("defaults to live URL/text analysis at /", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.locator('[data-testid="live-home"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("heading", { name: "Análisis contextual" })).toBeVisible();
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByTestId("live-human-boundary")).toContainText("La decisión sigue siendo humana");
    await expect(page.locator('[data-testid="editorial-shell"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir caso A1 de demostración" })).toHaveAttribute("href", "/demo");
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });

  test("submits pasted text from the live default route", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route("**/api/analyses", async (route) => {
      requestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: analysis.started\ndata: {\"analysisId\":\"root\",\"textLength\":20,\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction.v3\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[]}\n\nevent: analysis.completed\ndata: {\"analysisId\":\"root\",\"status\":\"failed\",\"claims\":[],\"limitations\":[\"Prueba controlada\"],\"traceEventIds\":[],\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction.v3\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[\"Prueba controlada\"]}\n\n",
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
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });

  test("retains compact live analysis at /compact", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compact");

    await expect(page.locator('[data-testid="compact-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("analysis-text-input")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir revisión completa" })).toHaveAttribute("href", "/demo");
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth)).resolves.toBe(true);
  });
});
