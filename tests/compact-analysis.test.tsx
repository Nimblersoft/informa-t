/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { CompactAnalysis } from "../src/client/components/CompactAnalysis";
import { LiveAnalysisHome } from "../src/client/components/LiveAnalysisHome";

afterEach(() => cleanup());

describe("CompactAnalysis", () => {
  it("renders the compact input and explicit human editorial boundary", () => {
    render(<CompactAnalysis />);

    expect(screen.getByTestId("compact-shell").getAttribute("data-ready")).toBe("true");
    expect(screen.getByRole("heading", { name: "Vista compacta" })).toBeTruthy();
    expect(screen.getByTestId("analysis-text-input")).toBeTruthy();
    expect(screen.getByTestId("compact-human-boundary").textContent).toContain("La decisión sigue siendo humana");
    expect(screen.queryByText("Cierto")).toBeNull();
    expect(screen.queryByText("Falso")).toBeNull();
  });
});

describe("LiveAnalysisHome", () => {
  it("renders the live input-led default without an A1 shell or verdict controls", () => {
    render(<LiveAnalysisHome />);

    expect(screen.getByTestId("live-home").getAttribute("data-ready")).toBe("true");
    expect(screen.getByRole("heading", { name: "Análisis contextual" })).toBeTruthy();
    expect(screen.getByTestId("analysis-text-input")).toBeTruthy();
    expect(screen.getByTestId("live-human-boundary").textContent).toContain("La decisión sigue siendo humana");
    expect(screen.queryByTestId("editorial-shell")).toBeNull();
    expect(screen.queryByText("Cierto")).toBeNull();
    expect(screen.queryByText("Falso")).toBeNull();
  });
});
