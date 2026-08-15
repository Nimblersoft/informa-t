# Spec: Official AI Search Provider and Idempotent Corpus Seeder

## 1. Purpose and Scope

This specification defines the architecture, binding contract, provider interface, retrieval semantics, provenance mapping, honest degradation behavior, and idempotent seeding strategy for official primary-evidence retrieval in `informa-t`.

The AI Search subsystem enables fact-checkers and journalists to search and retrieve authentic primary-source fragments (official decrees, statistics, bulletins, and datasets) without making autonomous true/false verdicts. All retrieval operations are auditable via structured trace events and degrade honestly when evidence is missing or incomplete.

Alignment references:
- PRD Requirement F-04 (Official Evidence Retrieval)
- `CONTEXT.md` (Definitions of Evidence excerpt, Primary source, Source registry, Official artifact, and Trace)
- `AGENTS.md` (Human editorial supremacy; zero autonomous publication verdicts)
- `docs/specs/corpus.md` (Curated official corpus schema and anti-oracle constraints)
- `docs/adr/0002-explicabilidad-mediante-trazas-estructuradas.md` (Deterministic structured trace events)

---

## 2. Cloudflare AI Search Binding Contract

The Worker runtime integrates Cloudflare AI Search via the `ai_search_namespaces` binding configured in `wrangler.jsonc`:

```jsonc
{
  "ai_search_namespaces": [
    {
      "binding": "AI_SEARCH",
      "namespace": "default",
      "remote": true
    }
  ]
}
```

### 2.1. Compatibility and Runtime Constraints
- **Compatibility Date**: Must be at least `2026-03-27` (current configuration uses `2026-08-15`).
- **Namespace Instance Name**: The dedicated official evidence instance is strictly `"informa-t-oficial"`.
- **Instance Architecture**: The deployed instance uses Cloudflare AI Search built-in storage and hybrid (dense vector embeddings + BM25 keyword matching) indexing.
- **Authority Boundary**: The local adapter and test suites interact only with local/fake bindings. Real Cloudflare API calls, credentials, or remote mutations are strictly out of scope during development and automated tests.

---

## 3. Fake-Bindable AI Search Surface

The provider interacts with a minimal, fake-bindable interface modeled locally to ensure full testability across unit, integration, and Worker environments:

```typescript
export interface AiSearchNamespaceBinding {
  get(instanceName: string): AiSearchInstance;
}

export interface AiSearchInstance {
  items: AiSearchInstanceItems;
  search(options: AiSearchRequestOptions): Promise<AiSearchResponse>;
}

export interface AiSearchInstanceItems {
  uploadAndPoll(
    name: string,
    content: string | Record<string, unknown> | { text: string; metadata?: Record<string, unknown> },
  ): Promise<unknown>;
}

export interface AiSearchRequestOptions {
  messages?: Array<{ role: string; content: string }>;
  query?: string;
  ai_search_options?: Record<string, unknown>;
}

export interface AiSearchResponse {
  results?: AiSearchChunk[];
  data?: AiSearchChunk[];
  chunks?: AiSearchChunk[];
  response?: string;
}

export interface AiSearchChunk {
  id?: string;
  text?: string;
  content?: string;
  excerpt?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}
```

---

## 4. Filter Semantics and Output Capping

### 4.1. Supported Filter Dimensions
The provider accepts search queries with optional filtering across four official provenance dimensions:
1. `institution`: Filter by responsible public entity (e.g., `"Instituto Nacional de Estadística y Censos (INEC)"`).
2. `collection`: Filter by specific dataset or publication series (e.g., `"Pobreza por Ingresos — ENEMDU"`).
3. `period`: Filter by temporal reporting period or statistical round (e.g., `"Junio 2025"`).
4. `type`: Filter by artifact category (e.g., `"Documento Oficial"`).

### 4.2. Filter Forwarding Rules
- Filters must be forwarded directly to `ai_search_options.filters` during the query invocation.
- Only explicitly provided, non-empty filter keys are passed; omitted or whitespace-only keys are excluded.
- Filter values are preserved verbatim and must not be discarded or post-filtered locally after the call.

### 4.3. Fragment Capping (Defensive Maximum of 5)
- Search queries request `max_num_results: 5` (or `Math.min(requestedMax, 5)`).
- The provider defensively slices the returned fragment array to at most **5** items (`chunks.slice(0, 5)`), ensuring strict adherence to the token and cognitive budget even if the underlying search service returns excess items.

---

## 5. EvidenceExcerpt Schema and Provenance Mapping

Retrieved fragments that satisfy complete provenance requirements are mapped to `EvidenceExcerpt` in `src/shared/contracts.ts`:

```typescript
export interface EvidenceExcerpt {
  id: string; // Document / fragment identifier
  institution: string; // Responsible official institution
  collection: string; // Official collection / dataset
  title: string; // Official publication / artifact title
  version: string; // Version / publication round
  sourceUrl: string; // Public official URL
  retrievalDate: string; // ISO 8601 retrieval date (YYYY-MM-DD)
  citationLocation: string; // Specific location (section, table, page)
  license: string; // Data license / terms of use
  coverageLimits: string; // Scope and boundaries of data
  excerpt: string; // Verbatim textual excerpt
  sha256: string; // Artifact raw byte SHA-256 hash
  period?: string; // Optional statistical period
  type?: string; // Optional artifact type
  score?: number; // Optional relevance score
}
```

### 5.1. Strict Provenance Integrity
Every field in `EvidenceExcerpt` must originate directly from the indexed document content and verified metadata. The provider must **never** synthesize, hallucinate, or extrapolate missing metadata.

### 5.2. Conservative Relevance Admission
After provenance validation, a fragment must share meaningful terms with the claim query across its official institution, collection, title, or excerpt. Stop words and presentation boilerplate do not count; a high-signal topical term in official collection/title metadata may admit a claim with additional numeric or contextual wording, while otherwise longer queries require at least two terms plus a minimum overlap ratio. Unrelated official fragments are discarded with a Spanish limitation. If no relevant fragment remains, the provider returns `Evidencia insuficiente` and an empty excerpt list.

---

## 6. Honest Insufficient Evidence & Non-Verdict Policy

In alignment with the core product guardrails:
1. **Never Infer Falsity**: The absence of matching documents, or the presence of incomplete metadata, signifies solely that official evidence is insufficient in the indexed corpus. It must **never** produce or imply a verdict of `Falso`, `Engañoso`, or any other category.
2. **Exact Outcome Label**: When search yields zero fragments OR any returned fragment is missing a required mapped attribute, the provider returns exactly:
   ```typescript
   {
     outcome: "Evidencia insuficiente",
     excerpts: [],
     limitations: [ ... ]
   }
   ```
3. **Explicit Trace Limitation**: An auditable limitation message explaining the specific cause (e.g., absent results, missing mandatory `sourceUrl` attribute, or unindexed coverage gap) must be appended to the trace event details and provider result.
4. **Valid Evidence Outcome**: When one or more fragments satisfy all required metadata attributes with no missing fields, the provider returns:
   ```typescript
   {
     outcome: "Evidencia encontrada",
     excerpts: [ ... ],
     limitations: []
   }
   ```

---

## 7. Idempotent Corpus Seeding (`scripts/seed-ai-search.ts`)

The seeder reads the official corpus manifest (`corpus/manifest.json`) and populates the `"informa-t-oficial"` AI Search instance with deterministic, idempotent semantics.

### 7.1. Stable Identifier Strategy
- Each document uploaded to AI Search is keyed by its unique `item.id` from `manifest.json` (e.g., `"inec-pobreza-2025-06"`, `"inec-pobreza-historica-series"`).
- Calling `uploadAndPoll(item.id, content)` replaces/upserts the existing document under that key.

### 7.2. Proof of Idempotence
- Running the seeder multiple times on identical manifest inputs produces identical logical items in the store without creating duplicate records or inflating document counts.
- `seedAiSearch` returns a structured `SeedReport` recording indexed count, item IDs, and trace events.

### 7.3. Upload Payload Construction
For each item:
- **Text**: Complete raw text read from `item.filePath` (e.g., `corpus/items/<id>/artifact.md`).
- **Metadata**: Full provenance record containing `id`, `institution`, `collection`, `title`, `version`, `sourceUrl`, `retrievalDate`, `retrievalMethod`, `citationLocation`, `license`, `coverageLimits`, `sha256`, `excerpt`, `period`, and `type`.

---

## 8. Structured Trace Events and Redaction

The provider and seeder emit structured trace events conforming to `TraceEvent` in `src/shared/contracts.ts`.

### 8.1. Stage Classification
- **Corpus Seeding / Indexing**: Stage `"Ingesta"`.
- **Evidence Retrieval / Search**: Stage `"Extracción"`.

### 8.2. Trace Safety and Redaction
- All trace payloads pass through `redactTrace()` (`src/shared/trace.ts`).
- Credentials, authorization tokens, client secrets, API keys, and chain-of-thought fields are strictly excluded.
- The `canonicalHash` is calculated using `hashCanonicalJson()` over the redacted details payload.
- All user-facing trace titles, descriptions, and statuses use Latin American Spanish.

---

## 9. Testing and Verification Strategy

Test suites under `tests/` must verify:
1. **Idempotent Seeding**: Prove that repeated seed runs result in stable IDs and no duplicate logical documents.
2. **Filter Forwarding**: Prove that `institution`, `collection`, `period`, and `type` filters are correctly structured and passed in `ai_search_options`.
3. **Output Cap**: Prove that result arrays larger than 5 are defensively capped to at most 5 fragments.
4. **Complete Mapping**: Prove that all 12 mandatory `EvidenceExcerpt` fields are correctly extracted and typed.
5. **Insufficient Evidence Handling**: Prove that empty results or missing required attributes produce exact `Evidencia insuficiente` with descriptive limitations and zero verdict leakage.
6. **Trace Safety**: Prove that emitted trace events conform to `TraceEvent` schema, use correct stages (`Ingesta`, `Extracción`), and contain no credentials or tokens.
