// # Spec: docs/specs/multimodel-fixtures.md

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CASE_IDS = ["a1", "a2", "a3", "b1", "c1"] as const;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN_CONTENT = [
  /chain[\s_-]*of[\s_-]*thought/i,
  /oauth/i,
  /ecuador\s*chequea/i,
  /chequeaprimero/i,
  /veredicto\s+esperado/i,
  /access[\s_-]*token/i,
  /api[\s_-]*key/i,
  /authorization/i,
  /credential/i,
  /password/i,
  /@[\w.-]+\.[a-z]{2,}/i,
  /\+?\d[\d\s().-]{7,}\d/,
  /\b(Cierto|Falso|Impreciso|Engañoso|Sátira|Inverificable)\b/i,
];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export function canonicalizeJson(value: Json): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`;
}

export function hashCanonicalJson(value: Json): string {
  return crypto.createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_TIMESTAMP.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function validateCapturedOutput(value: unknown, expectedId: string, errors: string[]): void {
  const keys = ["id", "fecha", "herramienta", "modelo", "promptId", "content", "contentSha256"];
  const expectedKeys = expectedId === "glm" ? [...keys, "operatorOverride"] : keys;
  if (!isObject(value) || !hasExactKeys(value, expectedKeys)) {
    errors.push(`${expectedId}: invalid captured-output shape`);
    return;
  }
  if (value.id !== expectedId) errors.push(`${expectedId}: unexpected id`);
  if (!isTimestamp(value.fecha)) errors.push(`${expectedId}: invalid fecha`);
  if (value.herramienta !== "kilo" && value.herramienta !== "agy") errors.push(`${expectedId}: invalid herramienta`);
  if (typeof value.modelo !== "string" || value.modelo.length === 0) errors.push(`${expectedId}: invalid modelo`);
  if (typeof value.promptId !== "string" || !/^multimodel-fixtures\.[a-z0-9]+\.(decomposition|openai|grok|glm)\.v1$/.test(value.promptId)) errors.push(`${expectedId}: invalid promptId`);
  if (!isObject(value.content)) errors.push(`${expectedId}: content must be a JSON object`);
  if (!isSha256(value.contentSha256)) errors.push(`${expectedId}: invalid contentSha256`);
  if (isObject(value.content) && isSha256(value.contentSha256) && hashCanonicalJson(value.content as Json) !== value.contentSha256) errors.push(`${expectedId}: content hash mismatch`);
  const expectedModels: Record<string, string> = {
    decomposition: "zai-coding-plan/glm-5.3",
    openai: "openai/gpt-5.6-sol",
    grok: "xai/grok-4.6",
    glm: "zai-coding-plan/glm-5.3",
  };
  if (value.herramienta !== "kilo" || value.modelo !== expectedModels[expectedId]) errors.push(`${expectedId}: unexpected capture tool or model`);
  if (expectedId === "glm") {
    const override = value.operatorOverride;
    if (!isObject(override) || override.replacedModel !== "gemini-3.7-flash-high" || override.reason !== "Antigravity backend 503" || override.authority !== "operator instruction 2026-08-15 11:48") errors.push("glm: missing operator override provenance");
  } else if ("operatorOverride" in value) {
    errors.push(`${expectedId}: unexpected operator override provenance`);
  }
}

function validateTrace(value: unknown, fixture: Record<string, unknown>, errors: string[]): void {
  if (!isObject(value) || !hasExactKeys(value, ["schemaVersion", "events"]) || value.schemaVersion !== "analysis-trace.v1" || !Array.isArray(value.events) || value.events.length !== 4) {
    errors.push("invalid traza shape");
    return;
  }
  const outputs = [fixture.decomposition, ...(fixture.proposals as unknown[])];
  for (const [index, event] of value.events.entries()) {
    if (!isObject(event) || !hasExactKeys(event, ["id", "stage", "fecha", "herramienta", "modelo", "promptId", "outputSha256", "status"])) {
      errors.push(`traza event ${index}: invalid shape`);
      continue;
    }
    const output = outputs[index];
    const outputHash = isObject(output) ? output.contentSha256 : undefined;
    if ((index === 0 ? event.stage === "decomposition" : event.stage === "proposal") === false) errors.push(`traza event ${index}: invalid stage`);
    if (!isTimestamp(event.fecha) || !isSha256(event.outputSha256) || event.outputSha256 !== outputHash) errors.push(`traza event ${index}: invalid provenance`);
    if (event.status !== "captured") errors.push(`traza event ${index}: invalid status`);
  }
}

function validateFixture(fixture: unknown, caseId: string): string[] {
  const errors: string[] = [];
  const keys = ["fixtureVersion", "caseId", "fecha", "herramienta", "modelo", "promptId", "proposalContentSha256", "decomposition", "proposals", "traza"];
  if (!isObject(fixture) || !hasExactKeys(fixture, keys)) return [`${caseId}: invalid fixture shape`];
  if (fixture.fixtureVersion !== "multimodel-fixture.v1" || fixture.caseId !== caseId || !isTimestamp(fixture.fecha) || fixture.herramienta !== "multimodel" || typeof fixture.modelo !== "string" || fixture.promptId !== "multimodel-fixtures.v1") errors.push(`${caseId}: invalid fixture metadata`);
  validateCapturedOutput(fixture.decomposition, "decomposition", errors);
  if (!Array.isArray(fixture.proposals) || fixture.proposals.length !== 3) {
    errors.push(`${caseId}: expected exactly three proposals`);
  } else {
    const expected = ["openai", "grok", "glm"];
    fixture.proposals.forEach((proposal, index) => validateCapturedOutput(proposal, expected[index], errors));
    const proposalModels = fixture.proposals.map((proposal) => (isObject(proposal) ? proposal.modelo : ""));
    if (new Set(proposalModels).size !== 3) errors.push(`${caseId}: proposal models must be distinct`);
    if (isSha256(fixture.proposalContentSha256) && hashCanonicalJson(fixture.proposals as Json) !== fixture.proposalContentSha256) errors.push(`${caseId}: proposal aggregate hash mismatch`);
  }
  if (!isSha256(fixture.proposalContentSha256)) errors.push(`${caseId}: invalid proposalContentSha256`);
  validateTrace(fixture.traza, fixture, errors);
  const serialized = JSON.stringify(fixture);
  for (const pattern of FORBIDDEN_CONTENT) {
    if (pattern.test(serialized)) errors.push(`${caseId}: forbidden content matching ${pattern}`);
  }
  return errors;
}

export function validateFixtures(repoRoot = process.cwd()): string[] {
  const casesDirectory = path.join(repoRoot, "src/fixtures/cases");
  const errors: string[] = [];
  for (const caseId of CASE_IDS) {
    const filePath = path.join(casesDirectory, `${caseId}.json`);
    if (!fs.existsSync(filePath)) {
      errors.push(`${caseId}: fixture file is missing`);
      continue;
    }
    try {
      errors.push(...validateFixture(JSON.parse(fs.readFileSync(filePath, "utf8")), caseId));
    } catch (error) {
      errors.push(`${caseId}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  return errors;
}

if (process.argv[1]?.endsWith("validate-fixtures.ts")) {
  const errors = validateFixtures();
  if (errors.length > 0) {
    console.error("Fixture validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log("Fixture validation passed for A1, A2, A3, B1, and C1.");
  }
}
