export const CATEGORIES = [
  "Cierto",
  "Falso",
  "Impreciso",
  "Engañoso",
  "Sátira",
  "Inverificable",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface SyntheticProposal {
  placeholder: true;
  attributed: false;
  message: string;
}

export interface DemoCase {
  id: string;
  label: string;
  proposals: [SyntheticProposal, SyntheticProposal, SyntheticProposal];
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORIES.includes(value as Category);
}

export function parseDemoCase(value: unknown): DemoCase {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "label", "proposals"])) {
    throw new TypeError("Invalid demo case");
  }

  if (
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    !Array.isArray(value.proposals) ||
    value.proposals.length !== 3 ||
    !value.proposals.every(isSyntheticProposal)
  ) {
    throw new TypeError("Invalid demo case");
  }

  return value as unknown as DemoCase;
}

function isSyntheticProposal(value: unknown): value is SyntheticProposal {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["placeholder", "attributed", "message"]) &&
    value.placeholder === true &&
    value.attributed === false &&
    typeof value.message === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value);
  return valueKeys.length === keys.length && valueKeys.every((key) => keys.includes(key));
}
