import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Compact analysis route", () => {
  test("renders directly at 390px without overflow and passes serious axe checks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compact");

    await expect(page.locator('[data-testid="compact-shell"]')).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("heading", { name: "Vista compacta" })).toBeVisible();
    await expect(page.getByTestId("compact-human-boundary")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir revisión completa" })).toHaveAttribute("href", "/demo");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth);
    expect(overflow).toBe(true);

    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("submits both pasted text and public URL through the existing analysis endpoint", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route("**/api/analyses", async (route) => {
      requests.push(JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "event: analysis.started\ndata: {\"analysisId\":\"compact\",\"textLength\":20,\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[]}\n\nevent: analysis.completed\ndata: {\"analysisId\":\"compact\",\"status\":\"failed\",\"claims\":[],\"limitations\":[\"Prueba controlada\"],\"traceEventIds\":[],\"pipelineVersion\":\"analysis-sse.v1\",\"promptVersion\":\"claim-extraction-prompt.v4\",\"durationMs\":1,\"usage\":null,\"retries\":0,\"degradations\":[\"Prueba controlada\"]}\n\n",
      });
    });

    await page.goto("/compact");
    const input = page.getByTestId("analysis-text-input");
    const submit = page.getByTestId("analysis-submit");
    await input.fill("Texto pegado suficientemente largo para revisar.");
    await submit.click();
    await expect(page.getByText("Estado: fallido")).toBeVisible();

    await input.fill("https://example.com/noticia-publica");
    await submit.click();
    await expect(page.getByText("Estado: fallido")).toBeVisible();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests).toEqual([
      { text: "Texto pegado suficientemente largo para revisar." },
      { url: "https://example.com/noticia-publica" },
    ]);
  });
});
