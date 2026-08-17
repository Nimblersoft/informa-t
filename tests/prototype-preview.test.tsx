/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PrototypePreview } from "../src/client/components/PrototypePreview";

describe("PrototypePreview Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the prototype shell with header and extract feed without backend APIs", () => {
    render(<PrototypePreview />);

    expect(screen.getByTestId("prototype-shell")).toBeDefined();
    expect(screen.getByTestId("proto-header")).toBeDefined();
    expect(screen.getByTestId("proto-extract-1")).toBeDefined();
    expect(screen.getByTestId("proto-extract-2")).toBeDefined();
    expect(screen.getByTestId("proto-extract-3")).toBeDefined();
  });

  it("allows switching between demo variants (A, B, C, D)", () => {
    render(<PrototypePreview />);

    expect(screen.getByTestId("variant-extracts-content")).toBeDefined();

    fireEvent.click(screen.getByTestId("variant-btn-meters"));
    expect(screen.getByTestId("variant-meters-content")).toBeDefined();
    expect(screen.getByText(/Índice de Polarización/i)).toBeDefined();

    fireEvent.click(screen.getByTestId("variant-btn-contrast"));
    expect(screen.getByTestId("variant-contrast-content")).toBeDefined();

    fireEvent.click(screen.getByTestId("variant-btn-audit"));
    expect(screen.getByTestId("variant-audit-content")).toBeDefined();
    expect(screen.getByText(/Traza Criptográfica de Auditoría/i)).toBeDefined();
  });

  it("updates verdict in human-in-the-loop decision box and displays toast", () => {
    render(<PrototypePreview />);

    const falseBtn = screen.getByTestId("vbtn-false");
    fireEvent.click(falseBtn);

    expect(screen.getByTestId("proto-toast")).toBeDefined();
    expect(screen.getByTestId("proto-toast").textContent).toContain("Veredicto actualizado para Extracto #1: Falso");
  });

  it("opens and closes the ClaimReview JSON-LD modal", () => {
    render(<PrototypePreview />);

    const openModalBtn = screen.getByText(/Schema.org ClaimReview JSON-LD/i);
    fireEvent.click(openModalBtn);

    expect(screen.getByText(/Estructura canónica interoperable con Google Fact Check/i)).toBeDefined();

    const closeBtn = screen.getByText("Cerrar");
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Estructura canónica interoperable con Google Fact Check/i)).toBeNull();
  });
});
