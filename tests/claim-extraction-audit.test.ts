import { describe, expect, it, vi } from "vitest";

import { AUDIT_RETENTION_MS, deleteExpired, persistClaimExtractionAudit, type AuditDatabase, type AuditStatement, type ClaimExtractionAuditRecord } from "../src/server/audit/claim-extraction-audit";

function record(overrides: Partial<ClaimExtractionAuditRecord> = {}): ClaimExtractionAuditRecord {
  return {
    analysisId: "analysis-1",
    claimIndex: 0,
    traceEventId: "trace-1",
    claimText: "La pobreza se ha reducido en un 20%",
    extractorDecision: "ambigüedad",
    pipelineDisposition: "continuar_con_contexto",
    rationale: "Falta período, geografía o base.",
    provider: "openrouter",
    modelId: "openai/gpt-5.6-luna",
    promptVersion: "claim-extraction-prompt.v4",
    pipelineVersion: "analysis-sse.v1",
    canonicalHash: "a".repeat(64),
    degradations: [],
    createdAt: 1_000,
    ...overrides,
  };
}

function fakeDatabase() {
  const statements: Array<{ query: string; values: unknown[] }> = [];
  const db: AuditDatabase = {
    prepare(query) {
      return {
        bind(...values: unknown[]) {
          statements.push({ query, values });
          return this;
        },
      };
    },
    batch: vi.fn(async () => []),
  };
  return { db, statements };
}

describe("claim extraction audit adapter", () => {
  it("persists only the minimal claim decision fields with seven-day expiry", async () => {
    const { db, statements } = fakeDatabase();
    await persistClaimExtractionAudit(db, [record()]);

    expect(statements[0].query).toContain("INSERT OR IGNORE");
    expect(statements[0].values).toContain("La pobreza se ha reducido en un 20%");
    expect(statements[0].values).toContain(1_000 + AUDIT_RETENTION_MS);
    expect(statements[0].values.join(" ")).not.toContain("sourceUrl");
    expect(statements[0].values.join(" ")).not.toContain("headers");
    expect(statements[0].values.join(" ")).not.toContain("body");
  });

  it("uses one batch and ignores duplicate keys at the database constraint", async () => {
    const { db } = fakeDatabase();
    await persistClaimExtractionAudit(db, [record(), record({ claimIndex: 1 })]);
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.batch).toHaveBeenCalledWith(expect.arrayContaining([expect.anything(), expect.anything()]));
  });

  it("deletes rows whose retention deadline has passed during cron", async () => {
    const { db, statements } = fakeDatabase();
    await deleteExpired(db, 9_000);
    expect(statements[0].query).toContain("DELETE FROM claim_extraction_audit");
    expect(statements[0].values).toEqual([9_000]);
  });
});
