/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LandingPage } from "../src/client/components/LandingPage";

describe("LandingPage Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the hero section, key metrics, and primary action buttons", () => {
    render(<LandingPage />);

    expect(screen.getByTestId("landing-shell")).toBeDefined();
    expect(screen.getByTestId("landing-cta-app").getAttribute("href")).toBe("/app");
    expect(screen.getByTestId("hero-launch-app").getAttribute("href")).toBe("/app");
    expect(screen.getByTestId("hero-launch-presentation").getAttribute("href")).toBe("/presentation");
    expect(screen.getByTestId("hero-launch-prototype").getAttribute("href")).toBe("/prototype");

    expect(screen.getAllByText(/Asistente editorial con IA auditable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Civic Tech Ecuador/i).length).toBeGreaterThan(0);
  });

  it("renders the comparison matrix table with all evaluated capabilities", () => {
    render(<LandingPage />);

    const table = screen.getByTestId("comparison-table");
    expect(table).toBeDefined();
    expect(screen.getByText(/Corpus Oficial Curado \(Ecuador\)/i)).toBeDefined();
    expect(screen.getAllByText(/Consenso Multi-Modelo \(2\/3\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Frontera Ética/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Schema.org ClaimReview JSON-LD/i).length).toBeGreaterThan(0);
  });

  it("renders all module hub cards linking to different app routes", () => {
    render(<LandingPage />);

    expect(screen.getByTestId("hub-card-app").getAttribute("href")).toBe("/app");
    expect(screen.getByTestId("hub-card-presentation").getAttribute("href")).toBe("/presentation");
    expect(screen.getByTestId("hub-card-prototype").getAttribute("href")).toBe("/prototype");
    expect(screen.getByTestId("hub-card-demo").getAttribute("href")).toBe("/demo");
    expect(screen.getByTestId("hub-card-compact").getAttribute("href")).toBe("/compact");
    expect(screen.getByTestId("hub-card-walkthrough").getAttribute("href")).toBe("/walkthrough");
  });

  it("allows toggling FAQ accordions", () => {
    render(<LandingPage />);

    const firstFaq = screen.getByText(/¿La IA de informa-t decide si una noticia es falsa o verdadera\?/i);
    expect(screen.queryByText(/informa-t es un asistente de contraste y extracción/i)).toBeNull();

    fireEvent.click(firstFaq);
    expect(screen.getByText(/informa-t es un asistente de contraste y extracción/i)).toBeDefined();

    fireEvent.click(firstFaq);
    expect(screen.queryByText(/informa-t es un asistente de contraste y extracción/i)).toBeNull();
  });
});
