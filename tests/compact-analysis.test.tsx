/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { CompactAnalysis } from "../src/client/components/CompactAnalysis";
import { LiveAnalysisHome } from "../src/client/components/LiveAnalysisHome";
import { PublicWalkthrough } from "../src/client/components/PublicWalkthrough";

afterEach(() => cleanup());

describe("CompactAnalysis", () => {
  it("renders the compact input and explicit human editorial boundary", () => {
    render(<CompactAnalysis />);

    expect(screen.getByTestId("compact-shell").getAttribute("data-ready")).toBe("true");
    expect(screen.getByRole("heading", { name: "Vista compacta" })).toBeTruthy();
    expect(screen.getByTestId("analysis-text-input")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Previsualización extensión de navegador" }).getAttribute("href")).toBe("/walkthrough");
    expect(screen.getByTestId("compact-human-boundary").textContent).toContain("La decisión sigue siendo humana");
    expect(screen.queryByText("Cierto")).toBeNull();
    expect(screen.queryByText("Falso")).toBeNull();
  });
});

describe("LiveAnalysisHome", () => {
  it("renders the live route with the same editorial shell and prefilled analysis input", () => {
    render(<LiveAnalysisHome />);

    expect(screen.getByTestId("editorial-shell").getAttribute("data-ready")).toBe("true");
    expect(screen.getByTestId("analysis-text-input")).toBeTruthy();
    expect(screen.getByTestId("analysis-orientation").textContent).toContain("Trazabilidad");
    expect((screen.getByTestId("analysis-text-input") as HTMLTextAreaElement).value).toBe("Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.");
    expect(screen.getByTestId("analysis-tabs")).toBeTruthy();
  });
});

describe("PublicWalkthrough", () => {
  it("offers direct Spanish actions and preserves the human editorial boundary", () => {
    render(<PublicWalkthrough />);

    expect(screen.getByTestId("walkthrough-shell").getAttribute("data-ready")).toBe("true");
    expect(screen.getByRole("heading", { name: "Recorrido de la demostración" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar análisis en vivo" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Abrir caso A1 de demostración" }).getAttribute("href")).toBe("/demo");
    expect(screen.getByRole("link", { name: "Abrir vista compacta" }).getAttribute("href")).toBe("/compact");
    expect(screen.getByText("La decisión editorial no se automatiza")).toBeTruthy();
  });
});
