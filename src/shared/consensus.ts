import { isCategory, type Category } from "./contracts";

export interface CategoryConsensus {
  category: Category;
  agreement: "2/3" | "3/3";
}

export function getCategoryConsensus(
  values: readonly unknown[],
): CategoryConsensus | null {
  if (values.length !== 3) {
    return null;
  }

  const counts = new Map<Category, number>();

  for (const value of values) {
    if (isCategory(value)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  for (const [category, count] of counts) {
    if (count === 3) {
      return { category, agreement: "3/3" };
    }
    if (count === 2) {
      return { category, agreement: "2/3" };
    }
  }

  return null;
}

export function getIndexAggregate(values: readonly unknown[]): number | null {
  if (values.length !== 2 && values.length !== 3) {
    return null;
  }

  const validValues = values.filter(isIndexValue);

  if (validValues.length < 2 || !hasQualifyingPair(validValues)) {
    return null;
  }

  if (validValues.length === 2) {
    return Math.round((validValues[0] + validValues[1]) / 2);
  }

  return [...validValues].sort((left, right) => left - right)[
    Math.floor(validValues.length / 2)
  ];
}

function isIndexValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

function hasQualifyingPair(values: readonly number[]): boolean {
  return values.some((value, index) =>
    values.slice(index + 1).some((other) => Math.abs(value - other) <= 15),
  );
}
