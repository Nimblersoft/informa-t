CREATE TABLE IF NOT EXISTS claim_extraction_audit (
  analysis_id TEXT NOT NULL,
  claim_index INTEGER NOT NULL,
  trace_event_id TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  extractor_decision TEXT NOT NULL,
  pipeline_disposition TEXT NOT NULL,
  rationale TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  pipeline_version TEXT NOT NULL,
  canonical_hash TEXT NOT NULL,
  degradations_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (analysis_id, claim_index)
);

CREATE INDEX IF NOT EXISTS claim_extraction_audit_expires_at_idx
  ON claim_extraction_audit (expires_at);
