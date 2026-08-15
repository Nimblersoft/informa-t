// # Spec: docs/specs/corpus.md

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect } from "vitest";
import { validateCorpus, computeRawFileSha256 } from "../scripts/validate-corpus";

/**
 * TEST-ONLY oracle detection list:
 * These strings represent published external fact-checking outcomes, article titles,
 * and editorial verdicts from Ecuador Chequea documented in research.
 * Per the anti-oracle contract, none of these published results or external
 * fact-check conclusions may be leaked into the official primary corpus or metadata.
 */
const TEST_ONLY_ORACLE_PROHIBITED_STRINGS = [
  "ecuador chequea",
  "ecuadorchequea",
  "chequeaprimero",
  "resultado publicado",
  "veredicto publicado",
  "la entrevista de daniel noboa en teleamazonas",
  "daniel noboa hablo en radio city",
  "daniel noboa en radio sucre, verificado",
  "usd 158,06 millones segun la verificacion",
] as const;

function getAllCorpusFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllCorpusFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeString(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

describe("Curated Official Corpus and Provenance Integrity", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const corpusDir = path.join(repoRoot, "corpus");

  it("passes comprehensive validation for manifest, items, provenance, and hashes", () => {
    const report = validateCorpus(repoRoot);
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.itemCount).toBeGreaterThanOrEqual(2);
    expect(report.exclusionCount).toBeGreaterThanOrEqual(3);
    expect(report.coveredCases).toEqual(["a1", "a2", "a3", "b1", "c1"]);
  });

  it("strictly prohibits external fact-check oracle strings and published verdicts in all corpus files", () => {
    const allFiles = getAllCorpusFiles(corpusDir);
    expect(allFiles.length).toBeGreaterThan(0);

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const normalizedContent = normalizeString(content);

      for (const prohibited of TEST_ONLY_ORACLE_PROHIBITED_STRINGS) {
        const normalizedProhibited = normalizeString(prohibited);
        const containsProhibited = normalizedContent.includes(normalizedProhibited);
        expect(
          containsProhibited,
          `File ${path.relative(repoRoot, filePath)} must not contain prohibited oracle string: "${prohibited}"`,
        ).toBe(false);
      }
    }
  });

  it("verifies raw byte SHA-256 computation against stored artifact hashes", () => {
    const manifestPath = path.join(corpusDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    for (const item of manifest.items) {
      const fullPath = path.join(repoRoot, item.filePath);
      const computedSha256 = computeRawFileSha256(fullPath);
      expect(computedSha256.toLowerCase()).toBe(item.sha256.toLowerCase());
    }
  });

  it("detects and flags raw-byte hash drift in a temporary fixture", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "informa-t-corpus-test-"));
    try {
      // Copy corpus tree to temp directory
      const tmpCorpus = path.join(tmpDir, "corpus");
      fs.cpSync(corpusDir, tmpCorpus, { recursive: true });

      // Corrupt one artifact file by appending a byte
      const corruptedArtifactPath = path.join(
        tmpCorpus,
        "items",
        "inec-pobreza-2025-06",
        "artifact.md",
      );
      fs.appendFileSync(corruptedArtifactPath, "\n<!-- unauthorized edit -->");

      const report = validateCorpus(tmpDir);
      expect(report.valid).toBe(false);
      expect(
        report.errors.some((err) =>
          err.includes("SHA-256 hash mismatch for corpus/items/inec-pobreza-2025-06/artifact.md"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects and flags missing required case coverage", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "informa-t-corpus-test-"));
    try {
      const tmpCorpus = path.join(tmpDir, "corpus");
      fs.cpSync(corpusDir, tmpCorpus, { recursive: true });

      // Remove exclusion for A2
      const manifestPath = path.join(tmpCorpus, "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifest.exclusions = manifest.exclusions.filter(
        (ex: { caseId: string }) => ex.caseId !== "a2",
      );
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

      const report = validateCorpus(tmpDir);
      expect(report.valid).toBe(false);
      expect(
        report.errors.some((err) =>
          err.includes('Missing required case coverage for case "A2"'),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects and flags path traversal attempts in manifest item paths", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "informa-t-corpus-test-"));
    try {
      const tmpCorpus = path.join(tmpDir, "corpus");
      fs.cpSync(corpusDir, tmpCorpus, { recursive: true });

      const manifestPath = path.join(tmpCorpus, "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifest.items[0].filePath = "../outside.md";
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

      const report = validateCorpus(tmpDir);
      expect(report.valid).toBe(false);
      expect(
        report.errors.some((err) =>
          err.includes("filePath must be a relative path inside corpus/"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects and flags malformed manifest JSON", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "informa-t-corpus-test-"));
    try {
      const tmpCorpus = path.join(tmpDir, "corpus");
      fs.cpSync(corpusDir, tmpCorpus, { recursive: true });

      const manifestPath = path.join(tmpCorpus, "manifest.json");
      fs.writeFileSync(manifestPath, "{ malformed json", "utf-8");

      const report = validateCorpus(tmpDir);
      expect(report.valid).toBe(false);
      expect(report.errors.some((err) => err.includes("Failed to parse manifest JSON"))).toBe(
        true,
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
