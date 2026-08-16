// # Spec: docs/specs/claim-extraction-audit.md

export const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export interface AuditStatement {
  bind(...values: unknown[]): AuditStatement;
}

export interface AuditDatabase {
  prepare(query: string): AuditStatement;
  batch(statements: readonly AuditStatement[]): Promise<unknown[]>;
}

export interface ClaimExtractionAuditRecord {
  analysisId: string;
  claimIndex: number;
  traceEventId: string;
  claimText: string;
  extractorDecision: string;
  pipelineDisposition: string;
  rationale: string;
  provider: string;
  modelId: string;
  promptVersion: string;
  pipelineVersion: string;
  canonicalHash: string;
  degradations: string[];
  createdAt: number;
  expiresAt?: number;
}

const INSERT_AUDIT = `INSERT OR IGNORE INTO claim_extraction_audit
  (analysis_id, claim_index, trace_event_id, claim_text, extractor_decision,
   pipeline_disposition, rationale, provider, model_id, prompt_version,
   pipeline_version, canonical_hash, degradations_json, created_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export async function persistClaimExtractionAudit(db: AuditDatabase | undefined, records: readonly ClaimExtractionAuditRecord[]): Promise<void> {
  if (!db) throw new Error("AUDIT_DB no está configurado.");
  if (records.length === 0) return;
  await db.batch(records.map((record) => db.prepare(INSERT_AUDIT).bind(
    record.analysisId,
    record.claimIndex,
    record.traceEventId,
    record.claimText,
    record.extractorDecision,
    record.pipelineDisposition,
    record.rationale,
    record.provider,
    record.modelId,
    record.promptVersion,
    record.pipelineVersion,
    record.canonicalHash,
    JSON.stringify(record.degradations),
    record.createdAt,
    record.expiresAt ?? record.createdAt + AUDIT_RETENTION_MS,
  )));
}

export async function deleteExpired(db: AuditDatabase | undefined, scheduledTime: number): Promise<void> {
  if (!db) return;
  await db.batch([db.prepare("DELETE FROM claim_extraction_audit WHERE expires_at <= ?").bind(scheduledTime)]);
}
