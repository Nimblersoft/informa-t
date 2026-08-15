import type { JsonValue } from "./contracts";

const SENSITIVE_KEY_PARTS = [
  "chainofthought",
  "secret",
  "token",
  "authorization",
  "authentication",
  "credential",
  "password",
  "passwd",
  "apikey",
  "privatekey",
  "clientsecret",
  "cookie",
  "header",
] as const;

export function redactTrace(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(redactTrace);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, nestedValue]) => [key, redactTrace(nestedValue)]),
    );
  }

  return value;
}

export async function hashCanonicalJson(value: unknown): Promise<string> {
  const canonicalJson = canonicalizeJson(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson),
  );

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function canonicalizeJson(value: unknown): string {
  return canonicalize(value, new Set<object>());
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    normalizedKey.startsWith("auth") ||
    SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part))
  );
}

function canonicalize(value: unknown, stack: Set<object>): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    throw new TypeError("Canonical JSON supports JSON values only");
  }

  if (stack.has(value)) {
    throw new TypeError("Canonical JSON does not support cyclic values");
  }

  stack.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).some((key) => !isArrayIndex(key, value.length))) {
        throw new TypeError("Canonical JSON does not support array properties");
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          throw new TypeError("Canonical JSON does not support sparse arrays");
        }
      }
      return `[${value.map((item) => canonicalize(item, stack)).join(",")}]`;
    }

    if (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      throw new TypeError("Canonical JSON supports plain objects only");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError("Canonical JSON does not support symbol keys");
    }

    const record = value as Record<string, unknown>;
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], stack)}`)
      .join(",")}}`;
  } finally {
    stack.delete(value);
  }
}

function isArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}
