import { describe, expect, it } from "vitest";

import { CATEGORIES, isCategory } from "../src/shared/contracts";
import { getCategoryConsensus, getIndexAggregate } from "../src/shared/consensus";

describe("category consensus", () => {
  it("returns 2/3 for two matching valid categories", () => {
    expect(getCategoryConsensus(["Cierto", "Cierto", "Falso"])).toEqual({
      category: "Cierto",
      agreement: "2/3",
    });
  });

  it("returns 3/3 for three matching valid categories", () => {
    expect(getCategoryConsensus(["Sátira", "Sátira", "Sátira"])).toEqual({
      category: "Sátira",
      agreement: "3/3",
    });
  });

  it("returns no consensus for three distinct valid categories", () => {
    expect(getCategoryConsensus(["Cierto", "Falso", "Impreciso"])).toBeNull();
  });

  it("rejects proposal lists that do not contain exactly three slots", () => {
    expect(getCategoryConsensus(["Cierto", "Cierto"])).toBeNull();
    expect(getCategoryConsensus(["Cierto", "Cierto", "Falso", "Falso"])).toBeNull();
  });
});

describe("numeric indices", () => {
  it("rounds the mean for two qualifying valid values", () => {
    expect(getIndexAggregate([20, 29])).toBe(25);
  });

  it("returns the median for three qualifying valid values", () => {
    expect(getIndexAggregate([12, 20, 80])).toBe(20);
  });

  it("accepts a pair at the exact tolerance boundary", () => {
    expect(getIndexAggregate([20, 35])).toBe(28);
  });

  it("does not aggregate invalid values", () => {
    expect(getIndexAggregate([101, 20.5, "20"])).toBeNull();
  });

  it("rejects more than three proposal slots", () => {
    expect(getIndexAggregate([20, 29, 35, 40])).toBeNull();
  });
});

describe("category closure", () => {
  it("accepts only the six exact category strings", () => {
    expect(CATEGORIES).toHaveLength(6);
    for (const category of CATEGORIES) {
      expect(isCategory(category)).toBe(true);
    }
    expect(isCategory("Enganoso")).toBe(false);
    expect(isCategory("Cierto ")).toBe(false);
    expect(isCategory("Sin consenso")).toBe(false);
  });
});
