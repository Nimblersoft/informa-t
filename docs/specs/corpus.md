# Spec: Curated Official Corpus, Provenance Manifest, and Artifact Integrity

## 1. Purpose and Scope

This specification defines the schema, provenance requirements, cryptographic integrity hashing, coverage and exclusion semantics, anti-oracle policy, and validation rules for the curated official corpus of `informa-t`.

The official corpus provides a reproducible, auditable repository of primary state documents, datasets, tables, and official publications needed by journalists and fact-checking teams during electoral information verification.

Primary research reference: `docs/research/corpus-oficial-y-casos-demo.md`.
Functional alignment: `docs/specs/mediahack-prd-draft.md` (requirement F-04: Official Evidence Retrieval), `CONTEXT.md` (definitions of Primary source, Source registry, Official artifact, Evidence excerpt, and Related context), `docs/adr/0002-explicabilidad-mediante-trazas-estructuradas.md` (structured provenance without chain-of-thought or secrets), and `AGENTS.md` (human editorial supremacy).

---

## 2. Distinction Between Raw Artifact Hashing and Canonical JSON Hashing

The `informa-t` architecture defines two distinct, complementary cryptographic hashing mechanisms with different operational semantics:

### 2.1. Canonical JSON Hashing (`hashCanonicalJson`)
- **Implementation**: Defined in `src/shared/trace.ts` using Web Crypto Subtle SHA-256 over a canonicalized UTF-8 JSON AST representation.
- **Input Semantics**: In-memory JavaScript object/array structures, sorted by key, stripped of non-standard properties and whitespace variation.
- **Operational Purpose**: Ensures deterministic, tamper-evident trace events and payload hashing across API responses and logs, independent of key ordering or whitespace serialization.

### 2.2. Raw Artifact Byte Hashing (`sha256`)
- **Implementation**: Implemented in `scripts/validate-corpus.ts` using Node.js `crypto.createHash('sha256')` (or standard streaming SHA-256) over the raw byte stream of the stored file.
- **Input Semantics**: Verbatim file byte array (`fs.readFileSync(filePath)` or raw binary stream).
- **Operational Purpose**: Guarantees bit-for-bit document integrity against accidental edits, byte corruption, newline conversion, or unauthorized tampering of retained official evidence artifacts.
- **Cryptographic Equivalence**: Both algorithms produce standard FIPS 180-4 SHA-256 digests represented as 64-character lowercase hexadecimal strings. However, raw artifact hashing operates directly on disk byte sequences rather than structured JSON models.

---

## 3. Manifest and Item Metadata Schema

The curated corpus resides under `corpus/` with the following layout:

```
corpus/
  manifest.json
  items/
    <item-id>/
      metadata.json
      artifact.md (or .txt, .json, .csv)
```

### 3.1. Root Manifest Schema (`corpus/manifest.json`)

The manifest is a single JSON document containing:

```typescript
export interface CorpusManifest {
  schemaVersion: "1.0.0";
  updatedAt: string; // ISO 8601 UTC timestamp
  description: string;
  coveredCases: string[]; // List of required case identifiers: ["a1", "a2", "a3", "b1", "c1"]
  items: CorpusItemMetadata[];
  exclusions: CorpusExclusion[];
}
```

### 3.2. Corpus Item Metadata Schema (`CorpusItemMetadata`)

Every retained official artifact must have a dedicated `metadata.json` under `corpus/items/<item-id>/` and an entry in `manifest.json.items`:

```typescript
export interface CorpusItemMetadata {
  id: string; // Unique kebab-case identifier, e.g. "inec-pobreza-2025-06"
  caseIds: string[]; // Associated demo case identifiers, e.g. ["a1"]
  institution: string; // Responsible public institution, e.g. "Instituto Nacional de Estadística y Censos (INEC)"
  collection: string; // Official dataset, survey series, or publication collection
  title: string; // Exact official title of publication, report, or dataset
  version: string; // Edition, publication period, or version indicator
  sourceUrl: string; // Absolute public official URL (http/https)
  retrievalDate: string; // ISO 8601 date (YYYY-MM-DD)
  retrievalMethod: string; // Retrieval mechanism, e.g. "HTTP GET / Web Fetch"
  filePath: string; // Relative path to artifact file, e.g. "corpus/items/inec-pobreza-2025-06/artifact.md"
  metadataPath: string; // Relative path to metadata file, e.g. "corpus/items/inec-pobreza-2025-06/metadata.json"
  sha256: string; // Lowercase 64-character hex SHA-256 digest of the raw byte content of filePath
  citationLocation: string; // Specific location (page, table, section, row, etc.)
  license: string; // Public data license or official terms of use (e.g. "CC BY 4.0")
  coverageLimits: string; // Explicit statement of data scope and boundary limits
  excerpt: string; // Verbatim textual excerpt from the artifact directly supporting verification
}
```

### 3.3. Corpus Coverage Exclusion Schema (`CorpusExclusion`)

When an official source is inaccessible due to bot-detection/CAPTCHA barriers, dynamic proprietary portals without open APIs, unreleased data at the time of the review, or when the official source does not collect the requested attribute, an explicit coverage exclusion must be recorded:

```typescript
export interface CorpusExclusion {
  caseId: string; // Demo case identifier, e.g. "a2"
  claimText: string; // Factual claim under evaluation
  reason: string; // Truthful, precise explanation of why primary artifact is excluded
  institution: string; // Responsible official institution
  collection: string; // Queried official collection or dashboard
  sourceUrl: string; // Official source URL investigated
  retrievalDate: string; // ISO 8601 date of retrieval attempt
  retrievalMethod: string; // Retrieval method attempted
  coverageLimits: string; // Explicit explanation of what the official source covers vs lacks
  citationLocation: string; // Specific dashboard view, table name, or reference if available
}
```

---

## 4. Demo Cases Coverage and Exclusion Rules

All five demo case identifiers (`a1`, `a2`, `a3`, `b1`, `c1` / case-insensitive) must be strictly covered by either:
1. At least one valid retained official artifact (`CorpusItemMetadata`) with raw byte SHA-256 integrity, or
2. An explicit, machine-checkable coverage exclusion (`CorpusExclusion`).

### Case Coverage Matrix:

| Case ID | Topic / Claim | Official Source | Expected Modeling | Honest Rationale |
|---------|---------------|-----------------|-------------------|-------------------|
| **A1** | Pobreza por ingresos 2025 | INEC (`pobreza-por-ingresos-resultados-2025/`) | Official Artifact | Publicly accessible official bulletin and table. Contains June 2025 national poverty indicators. |
| **A2** | Muertes violentas y antecedentes penales | Ministerio del Interior (`estadisticas-seguridad-homicidios`) | Coverage Exclusion | Official aggregate dashboard does not track/publish prior convictions for homicide victims; portal is an interactive SPA behind Imperva/Incapsula bot controls. Missing attribute is recorded as insufficient coverage, not converted into a false verdict. |
| **A3** | Ventas SRI septiembre y octubre | SRI Información institucional / Estadísticas | Official Artifact or Exclusion | Evaluates official sales figures; October figures were unreleased at the time of initial claim. Modeled according to public official availability. |
| **B1** | Pobreza histórica 2017 vs 2025 | INEC (`pobreza-por-ingresos/`) | Official Artifact | Public historical income poverty series from INEC ENEMDU. |
| **C1** | Banco del Pacífico utilidades 2024 | Superintendencia de Bancos (`balances-generales/`) | Official Artifact or Exclusion | Official monthly financial statements / balance general from Superintendencia de Bancos. |

---

## 5. Anti-Oracle and Editorial Independence Policy

To maintain editorial independence and prevent evaluation leakage:

1. **No Published Fact-Check Verdicts**: The corpus manifest, item metadata files, and artifact documents must **never** contain the published fact-check verdict categories (e.g. `Cierto`, `Falso`, `Impreciso`, `Engañoso`, `Sátira`, `Inverificable` used as conclusions or outcomes) or published editorial results from external organizations (e.g., Ecuador Chequea).
2. **No Secondary Fact-Check Body Text**: Verbatim article text or analysis produced by external fact-checking outlets must not be stored in the official evidence corpus.
3. **No Private Keys or Citizen Data**: Corpus files must not contain secrets, tokens, credentials, or identifiable personal citizen data.
4. **Primary Evidence Only**: Only institutional public official texts, statistical figures, and legal/regulatory records may be retained as artifacts.

---

## 6. Corpus Validation Requirements (`scripts/validate-corpus.ts`)

The validation script `scripts/validate-corpus.ts` is invoked via `npm run corpus:validate` and must enforce the following rules:

1. **Schema & JSON Validity**:
   - Manifest `corpus/manifest.json` must be valid JSON matching `CorpusManifest`.
   - Every referenced metadata file (`metadataPath`) must exist, be valid JSON, and match `CorpusItemMetadata`.
2. **Mandatory Provenance Fields**:
   - `id`, `caseIds`, `institution`, `collection`, `title`, `version`, `sourceUrl`, `retrievalDate`, `retrievalMethod`, `filePath`, `metadataPath`, `sha256`, `citationLocation`, `license`, `coverageLimits`, `excerpt` must be non-empty strings (or non-empty arrays where specified).
3. **Path Safety and Containment**:
   - All `filePath` and `metadataPath` values must be relative paths within the `corpus/` directory.
   - Absolute paths and directory traversal sequences (`..`) outside `corpus/` are strictly rejected.
4. **Cryptographic Raw Byte SHA-256 Verification**:
   - For every item, read the raw bytes of `filePath` from disk and calculate SHA-256.
   - Compare with `item.sha256` (case-insensitive hex matching). Any mismatch causes validation failure.
5. **Complete Case Coverage**:
   - Every required case in `coveredCases` (`["a1", "a2", "a3", "b1", "c1"]`) must have at least one valid item in `items` or one valid exclusion in `exclusions`.
6. **Anti-Oracle Verification**:
   - Recursively inspect all files in `corpus/` to verify absence of forbidden external oracle strings or published verdicts.
7. **Exit Status**:
   - Returns exit code 0 when all validation rules pass.
   - Returns non-zero exit code (1) and logs descriptive diagnostic errors when any validation rule fails.
