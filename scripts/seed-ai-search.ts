// Spec: docs/specs/ai-search-provider.md

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const OFFICIAL_AI_SEARCH_INSTANCE = "informa-t-oficial" as const;

export interface CorpusManifestItem {
  id: string;
  caseIds: string[];
  institution: string;
  collection: string;
  title: string;
  version: string;
  sourceUrl: string;
  retrievalDate: string;
  retrievalMethod: string;
  filePath: string;
  metadataPath: string;
  sha256: string;
  citationLocation: string;
  license: string;
  coverageLimits: string;
  excerpt: string;
}

export interface CorpusManifestData {
  schemaVersion: string;
  updatedAt: string;
  description: string;
  coveredCases: string[];
  items: CorpusManifestItem[];
  exclusions?: unknown[];
}

export type TraceStage = "Ingesta" | "Extracción" | "Análisis" | "Consenso";

export interface TraceEvent {
  id: string;
  stage: TraceStage;
  timestamp: string;
  title: string;
  description: string;
  canonicalHash: string;
  status: string;
  details: string;
}

export interface AiSearchInstanceItems {
  uploadAndPoll(
    name: string,
    content: string | Record<string, unknown> | { text: string; metadata?: Record<string, unknown> },
    options?: { metadata?: Record<string, unknown>; [key: string]: unknown },
  ): Promise<unknown>;
}

export interface AiSearchInstance {
  items: AiSearchInstanceItems;
  search(options: {
    messages?: Array<{ role: string; content: string }>;
    query?: string;
    ai_search_options?: Record<string, unknown>;
  }): Promise<unknown>;
}

export interface AiSearchNamespaceBinding {
  get(instanceName: string): AiSearchInstance;
}

export interface SeedAiSearchOptions {
  repoRoot?: string;
  manifestPath?: string;
  binding?: AiSearchNamespaceBinding;
  instance?: AiSearchInstance;
  instanceName?: string;
  traceSink?: (event: TraceEvent) => void;
}

export interface SeedReport {
  success: boolean;
  indexedCount: number;
  itemIds: string[];
  errors: string[];
  traceEvents: TraceEvent[];
}

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

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    normalizedKey.startsWith("auth") ||
    SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part))
  );
}

export function redactTrace(value: unknown): unknown {
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
      return `[${value.map((item) => canonicalize(item, stack)).join(",")}]`;
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

export function canonicalizeJson(value: unknown): string {
  return canonicalize(value, new Set<object>());
}

export async function hashCanonicalJson(value: unknown): Promise<string> {
  const canonicalJson = canonicalizeJson(value);
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function getStableDocumentId(itemId: string): string {
  return itemId.trim();
}

export async function seedAiSearch(options: SeedAiSearchOptions = {}): Promise<SeedReport> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const manifestPath = options.manifestPath ?? path.join(repoRoot, "corpus", "manifest.json");
  const instanceName = options.instanceName ?? OFFICIAL_AI_SEARCH_INSTANCE;

  const errors: string[] = [];
  const traceEvents: TraceEvent[] = [];
  const indexedItemIds: string[] = [];

  if (!fs.existsSync(manifestPath)) {
    errors.push(`Manifest not found at path: ${manifestPath}`);
    return {
      success: false,
      indexedCount: 0,
      itemIds: [],
      errors,
      traceEvents,
    };
  }

  let manifest: CorpusManifestData;
  try {
    const rawManifest = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(rawManifest) as CorpusManifestData;
  } catch (error) {
    errors.push(`Failed to parse manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      indexedCount: 0,
      itemIds: [],
      errors,
      traceEvents,
    };
  }

  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    errors.push("Manifest does not contain any items to index.");
    return {
      success: false,
      indexedCount: 0,
      itemIds: [],
      errors,
      traceEvents,
    };
  }

  let instance: AiSearchInstance | undefined = options.instance;
  if (!instance && options.binding) {
    instance = options.binding.get(instanceName);
  }

  for (const item of manifest.items) {
    const stableName = getStableDocumentId(item.id);
    const fullFilePath = path.join(repoRoot, item.filePath);

    if (!fs.existsSync(fullFilePath)) {
      errors.push(`Artifact file not found for item "${item.id}": ${item.filePath}`);
      continue;
    }

    let artifactContent = "";
    try {
      artifactContent = fs.readFileSync(fullFilePath, "utf-8");
    } catch (readError) {
      errors.push(`Failed to read artifact for item "${item.id}": ${readError instanceof Error ? readError.message : String(readError)}`);
      continue;
    }

    const payload = {
      text: artifactContent,
      metadata: {
        id: item.id,
        institution: item.institution,
        collection: item.collection,
        title: item.title,
        version: item.version,
        sourceUrl: item.sourceUrl,
        retrievalDate: item.retrievalDate,
        retrievalMethod: item.retrievalMethod,
        citationLocation: item.citationLocation,
        license: item.license,
        coverageLimits: item.coverageLimits,
        sha256: item.sha256,
        excerpt: item.excerpt,
        period: item.version,
        type: "Documento Oficial",
      },
    };

    if (instance) {
      try {
        await instance.items.uploadAndPoll(stableName, payload);
      } catch (uploadError) {
        errors.push(`Upload failed for item "${item.id}": ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        continue;
      }
    }

    indexedItemIds.push(item.id);

    const eventDetails = {
      action: "seed_corpus_item",
      instanceName,
      itemId: item.id,
      stableName,
      institution: item.institution,
      collection: item.collection,
      title: item.title,
      sha256: item.sha256,
      sourceUrl: item.sourceUrl,
      mode: instance ? "binding_upload" : "dry_run_validation",
    };

    const redacted = redactTrace(eventDetails);
    const canonicalHash = await hashCanonicalJson(redacted);

    const traceEvent: TraceEvent = {
      id: `trace-seed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      stage: "Ingesta",
      timestamp: new Date().toISOString(),
      title: `Siembra de artefacto oficial en AI Search: ${item.id}`,
      description: `Artefacto oficial "${item.title}" (${item.institution}) indexado con ID estable "${stableName}".`,
      canonicalHash,
      status: "Completado",
      details: JSON.stringify(redacted),
    };

    traceEvents.push(traceEvent);
    options.traceSink?.(traceEvent);
  }

  const success = errors.length === 0;

  return {
    success,
    indexedCount: indexedItemIds.length,
    itemIds: indexedItemIds,
    errors,
    traceEvents,
  };
}

// CLI dry-run entry point
const isDirectlyExecuted =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    process.argv[1].endsWith("seed-ai-search.ts") ||
    process.argv[1].endsWith("seed-ai-search.js"));

if (isDirectlyExecuted) {
  seedAiSearch({ repoRoot: process.cwd() })
    .then((report) => {
      if (!report.success) {
        console.error("❌ Seeder dry-run failed with errors:");
        for (const err of report.errors) {
          console.error(`  - ${err}`);
        }
        process.exit(1);
      } else {
        console.log("✅ Seeder dry-run validation passed:");
        console.log(`  - Validated items to index: ${report.indexedCount}`);
        console.log(`  - Target stable IDs: ${report.itemIds.join(", ")}`);
        console.log(`  - Generated trace events: ${report.traceEvents.length}`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Fatal seeder error:", err);
      process.exit(1);
    });
}
