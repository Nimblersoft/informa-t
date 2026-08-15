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

## A1 development case route

`GET /api/demo/cases/a1` returns a schema-validated synthetic development payload. It labels the case exactly `Datos sintéticos de desarrollo`, contains exactly three non-attributed proposal placeholders, and makes no external calls. Unknown case IDs return HTTP 404. All API-visible text is Latin American Spanish.
