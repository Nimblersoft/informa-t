// # Spec: docs/specs/corpus.md

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export interface CorpusItemMetadata {
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

export interface CorpusExclusion {
  caseId: string;
  claimText: string;
  reason: string;
  institution: string;
  collection: string;
  sourceUrl: string;
  retrievalDate: string;
  retrievalMethod: string;
  coverageLimits: string;
  citationLocation: string;
}

export interface CorpusManifest {
  schemaVersion: string;
  updatedAt: string;
  description: string;
  coveredCases: string[];
  items: CorpusItemMetadata[];
  exclusions: CorpusExclusion[];
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
  exclusionCount: number;
  coveredCases: string[];
}

export const REQUIRED_CASES = ["a1", "a2", "a3", "b1", "c1"] as const;

const SHA256_REGEX = /^[0-9a-f]{64}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

export function computeRawFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export function validateCorpus(repoRoot: string = process.cwd()): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const manifestPath = path.join(repoRoot, "corpus", "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    errors.push(`Manifest not found at path: ${manifestPath}`);
    return {
      valid: false,
      errors,
      warnings,
      itemCount: 0,
      exclusionCount: 0,
      coveredCases: [],
    };
  }

  let manifest: CorpusManifest;
  try {
    const rawManifest = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(rawManifest) as CorpusManifest;
  } catch (error) {
    errors.push(`Failed to parse manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {
      valid: false,
      errors,
      warnings,
      itemCount: 0,
      exclusionCount: 0,
      coveredCases: [],
    };
  }

  if (manifest.schemaVersion !== "1.0.0") {
    errors.push(`Invalid schemaVersion: expected "1.0.0", got "${manifest.schemaVersion}"`);
  }

  if (!manifest.updatedAt || !ISO_DATE_REGEX.test(manifest.updatedAt)) {
    errors.push(`Invalid updatedAt timestamp: "${manifest.updatedAt}"`);
  }

  if (!manifest.description || typeof manifest.description !== "string" || manifest.description.trim().length === 0) {
    errors.push("Manifest description must be a non-empty string");
  }

  if (!Array.isArray(manifest.coveredCases) || manifest.coveredCases.length === 0) {
    errors.push("Manifest coveredCases must be a non-empty array of strings");
  }

  if (!Array.isArray(manifest.items)) {
    errors.push("Manifest items must be an array");
  }

  if (!Array.isArray(manifest.exclusions)) {
    errors.push("Manifest exclusions must be an array");
  }

  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const exclusions = Array.isArray(manifest.exclusions) ? manifest.exclusions : [];

  const seenItemIds = new Set<string>();
  const coveredCasesSet = new Set<string>();

  // Validate Items
  for (const [index, item] of items.entries()) {
    const itemPrefix = `Item [${index}] (${item?.id ?? "unknown"})`;

    if (!item || typeof item !== "object") {
      errors.push(`${itemPrefix}: item must be an object`);
      continue;
    }

    if (!item.id || typeof item.id !== "string" || item.id.trim().length === 0) {
      errors.push(`${itemPrefix}: id must be a non-empty string`);
    } else if (seenItemIds.has(item.id)) {
      errors.push(`${itemPrefix}: duplicate item id "${item.id}"`);
    } else {
      seenItemIds.add(item.id);
    }

    if (!Array.isArray(item.caseIds) || item.caseIds.length === 0) {
      errors.push(`${itemPrefix}: caseIds must be a non-empty array of strings`);
    } else {
      for (const caseId of item.caseIds) {
        if (typeof caseId !== "string" || caseId.trim().length === 0) {
          errors.push(`${itemPrefix}: invalid caseId in caseIds array`);
        } else {
          coveredCasesSet.add(caseId.trim().toLowerCase());
        }
      }
    }

    const mandatoryStringProps: Array<keyof CorpusItemMetadata> = [
      "institution",
      "collection",
      "title",
      "version",
      "sourceUrl",
      "retrievalDate",
      "retrievalMethod",
      "filePath",
      "metadataPath",
      "sha256",
      "citationLocation",
      "license",
      "coverageLimits",
      "excerpt",
    ];

    for (const prop of mandatoryStringProps) {
      const val = item[prop];
      if (typeof val !== "string" || val.trim().length === 0) {
        errors.push(`${itemPrefix}: missing or empty mandatory property "${prop}"`);
      }
    }

    if (item.sourceUrl && !item.sourceUrl.startsWith("http://") && !item.sourceUrl.startsWith("https://")) {
      errors.push(`${itemPrefix}: sourceUrl must be a valid HTTP or HTTPS URL: "${item.sourceUrl}"`);
    }

    if (item.sha256 && !SHA256_REGEX.test(item.sha256)) {
      errors.push(`${itemPrefix}: sha256 must be a 64-character lowercase hex string: "${item.sha256}"`);
    }

    // Path safety checks
    if (item.filePath) {
      if (path.isAbsolute(item.filePath) || item.filePath.includes("..") || !item.filePath.startsWith("corpus/")) {
        errors.push(`${itemPrefix}: filePath must be a relative path inside corpus/: "${item.filePath}"`);
      } else {
        const fullFilePath = path.join(repoRoot, item.filePath);
        if (!fs.existsSync(fullFilePath)) {
          errors.push(`${itemPrefix}: referenced filePath does not exist: "${item.filePath}"`);
        } else {
          const computedHash = computeRawFileSha256(fullFilePath);
          if (item.sha256 && computedHash.toLowerCase() !== item.sha256.toLowerCase()) {
            errors.push(
              `${itemPrefix}: SHA-256 hash mismatch for ${item.filePath}. Expected ${item.sha256}, calculated ${computedHash}`,
            );
          }
        }
      }
    }

    if (item.metadataPath) {
      if (path.isAbsolute(item.metadataPath) || item.metadataPath.includes("..") || !item.metadataPath.startsWith("corpus/")) {
        errors.push(`${itemPrefix}: metadataPath must be a relative path inside corpus/: "${item.metadataPath}"`);
      } else {
        const fullMetadataPath = path.join(repoRoot, item.metadataPath);
        if (!fs.existsSync(fullMetadataPath)) {
          errors.push(`${itemPrefix}: referenced metadataPath does not exist: "${item.metadataPath}"`);
        } else {
          try {
            const rawItemMetadata = fs.readFileSync(fullMetadataPath, "utf-8");
            const parsedMetadata = JSON.parse(rawItemMetadata) as Partial<CorpusItemMetadata>;
            if (parsedMetadata.id !== item.id) {
              errors.push(`${itemPrefix}: metadata.json id "${parsedMetadata.id}" does not match manifest item id "${item.id}"`);
            }
            if (parsedMetadata.sha256 !== item.sha256) {
              errors.push(`${itemPrefix}: metadata.json sha256 does not match manifest item sha256`);
            }
          } catch (e) {
            errors.push(`${itemPrefix}: failed to parse metadata.json at "${item.metadataPath}": ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }
  }

  // Validate Exclusions
  for (const [index, exclusion] of exclusions.entries()) {
    const exclusionPrefix = `Exclusion [${index}] (caseId: ${exclusion?.caseId ?? "unknown"})`;

    if (!exclusion || typeof exclusion !== "object") {
      errors.push(`${exclusionPrefix}: exclusion must be an object`);
      continue;
    }

    if (!exclusion.caseId || typeof exclusion.caseId !== "string" || exclusion.caseId.trim().length === 0) {
      errors.push(`${exclusionPrefix}: missing or empty caseId`);
    } else {
      coveredCasesSet.add(exclusion.caseId.trim().toLowerCase());
    }

    const mandatoryExclusionProps: Array<keyof CorpusExclusion> = [
      "claimText",
      "reason",
      "institution",
      "collection",
      "sourceUrl",
      "retrievalDate",
      "retrievalMethod",
      "coverageLimits",
      "citationLocation",
    ];

    for (const prop of mandatoryExclusionProps) {
      const val = exclusion[prop];
      if (typeof val !== "string" || val.trim().length === 0) {
        errors.push(`${exclusionPrefix}: missing or empty mandatory property "${prop}"`);
      }
    }

    if (exclusion.sourceUrl && !exclusion.sourceUrl.startsWith("http://") && !exclusion.sourceUrl.startsWith("https://")) {
      errors.push(`${exclusionPrefix}: sourceUrl must be a valid HTTP or HTTPS URL: "${exclusion.sourceUrl}"`);
    }
  }

  // Validate required case coverage
  for (const requiredCase of REQUIRED_CASES) {
    if (!coveredCasesSet.has(requiredCase)) {
      errors.push(`Missing required case coverage for case "${requiredCase.toUpperCase()}". It must be covered by an item or an exclusion.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    itemCount: items.length,
    exclusionCount: exclusions.length,
    coveredCases: Array.from(coveredCasesSet).sort(),
  };
}

// CLI entry point
const isDirectlyExecuted =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    process.argv[1].endsWith("validate-corpus.ts") ||
    process.argv[1].endsWith("validate-corpus.js"));

if (isDirectlyExecuted) {
  const result = validateCorpus(process.cwd());
  if (!result.valid) {
    console.error("❌ Corpus validation FAILED with errors:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Corpus validation PASSED:");
    console.log(`  - Retained items: ${result.itemCount}`);
    console.log(`  - Explicit exclusions: ${result.exclusionCount}`);
    console.log(`  - Covered cases: ${result.coveredCases.map((c) => c.toUpperCase()).join(", ")}`);
    process.exit(0);
  }
}
