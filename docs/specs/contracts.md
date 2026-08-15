# Spec: Deterministic analysis contracts

## Purpose

This specification defines the deterministic contracts shared by the initial Worker API and all later analysis phases. Model proposals and every derived consensus are non-binding analysis input. They are never an editorial verdict, publication decision, or replacement for a journalist's decision.

## Categories and category consensus

The closed category set is exactly: `Cierto`, `Falso`, `Impreciso`, `Engañoso`, `Sátira`, and `Inverificable`. No aliases, normalization, or additional category is accepted.

A category consensus exists only when at least two valid proposals have the same category. It records `2/3` when exactly two of three valid proposal categories match and `3/3` when all three match. Fewer than two valid proposal categories and three distinct valid categories have no consensus. No tie-breaking is performed.

## Numeric indices

An index value is valid only when it is an integer from 0 through 100 inclusive. Invalid values do not participate in aggregation. An aggregate exists only if a pair of valid values has an absolute distance of 15 or less.

With three valid values, the aggregate is the median. With two valid values, it is their arithmetic mean rounded to the nearest integer. With fewer than two valid values, or without a qualifying pair, no aggregate exists.

## Canonical JSON hash

The canonical hash is the SHA-256 hexadecimal digest of UTF-8 encoded canonical JSON. Canonical JSON recursively sorts object keys and normalizes JSON number representation so semantically identical JSON produces the same hash. Unsupported values are rejected rather than changed silently.

## Structured trace redaction

Traces retain only structured provenance. They must not contain chain-of-thought, private reasoning, secrets, credentials, authentication headers or tokens, or unnecessary personal data. Redaction removes sensitive fields at every nesting level, including `chainOfThought`, `chain_of_thought`, `secret`, `token`, and `authorization`, while preserving safe provenance fields.

## A1 development case route and DemoCase contract

`GET /api/demo/cases/a1` returns a schema-validated synthetic development payload representing the full case view. It labels the case exactly `Datos sintéticos de desarrollo`, makes no external calls, and unknown case IDs return HTTP 404. All API-visible text is Latin American Spanish.

The `DemoCase` contract is strictly validated by `parseDemoCase` to contain only the following required fields and exact structure:

1. **`id`**: Non-empty string identifier (e.g., `"a1"`).
2. **`label`**: Exact non-empty string label (e.g., `"Datos sintéticos de desarrollo"`).
3. **`proposals`**: Tuple of exactly three synthetic proposal placeholders (`[SyntheticProposal, SyntheticProposal, SyntheticProposal]`), each with:
   - `placeholder: true`
   - `attributed: false` (strictly anonymous, no provider or model attribution)
   - `message: string`
4. **`excerpts`**: Array of non-empty `ExcerptItem` objects representing primary evidence:
   - `id`: string
   - `title`: string
   - `quote`: string
   - `speaker`: string
   - `timestamp`: string
   - `sourceType`: string
   - `logEventId`: string
5. **`relatedContext`**: Array of `RelatedContextItem` objects representing contextual background:
   - `id`: string
   - `title`: string
   - `description`: string
   - `reference`: string
6. **`indices`**: Array of `IndexMetric` objects representing heuristic analytical signals:
   - `id`: string
   - `name`: string
   - `value`: integer between 0 and 100 inclusive
   - `max`: integer exactly 100
   - `rubric`: string
   - `justification`: string
   - `heuristicLabel`: string
   - `logEventId`: string
7. **`traceEvents`**: Array of `TraceEvent` objects representing auditable pipeline events:
   - `id`: string
   - `stage`: strictly one of `"Ingesta"`, `"Extracción"`, `"Análisis"`, `"Consenso"`
   - `timestamp`: string
   - `title`: string
   - `description`: string
   - `canonicalHash`: string
   - `status`: string
   - `details`: string
8. **`citations`**: Array of `SourceCitation` objects representing open primary source links:
   - `id`: string
   - `title`: string
   - `url`: string
   - `publisher`: string
   - `type`: string

Strict key validation (`hasOnlyKeys`) rejects any payload or nested structure containing extra, missing, or unrecognized properties.
