export const CATEGORIES = [
  "Cierto",
  "Falso",
  "Impreciso",
  "Engañoso",
  "Sátira",
  "Inverificable",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TRACE_STAGES = [
  "Ingesta",
  "Extracción",
  "Análisis",
  "Consenso",
] as const;

export type TraceStage = (typeof TRACE_STAGES)[number];

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface SyntheticProposal {
  placeholder: true;
  attributed: false;
  message: string;
}

export interface ExcerptItem {
  id: string;
  title: string;
  quote: string;
  speaker: string;
  timestamp: string;
  sourceType: string;
  logEventId: string;
}

export interface RelatedContextItem {
  id: string;
  title: string;
  description: string;
  reference: string;
}

export interface IndexMetric {
  id: string;
  name: string;
  value: number; // integer 0..100
  max: number; // integer 100
  rubric: string;
  justification: string;
  heuristicLabel: string;
  logEventId: string;
}

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

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  publisher: string;
  type: string;
}

export interface DemoCase {
  id: string;
  label: string;
  proposals: [SyntheticProposal, SyntheticProposal, SyntheticProposal];
  excerpts: ExcerptItem[];
  relatedContext: RelatedContextItem[];
  indices: IndexMetric[];
  traceEvents: TraceEvent[];
  citations: SourceCitation[];
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORIES.includes(value as Category);
}

export function isTraceStage(value: unknown): value is TraceStage {
  return typeof value === "string" && TRACE_STAGES.includes(value as TraceStage);
}

export function parseDemoCase(value: unknown): DemoCase {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "label",
      "proposals",
      "excerpts",
      "relatedContext",
      "indices",
      "traceEvents",
      "citations",
    ])
  ) {
    throw new TypeError("Invalid demo case");
  }

  if (
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    typeof value.label !== "string" ||
    value.label.trim().length === 0 ||
    !Array.isArray(value.proposals) ||
    value.proposals.length !== 3 ||
    !value.proposals.every(isSyntheticProposal) ||
    !Array.isArray(value.excerpts) ||
    value.excerpts.length === 0 ||
    !value.excerpts.every(isExcerptItem) ||
    !Array.isArray(value.relatedContext) ||
    !value.relatedContext.every(isRelatedContextItem) ||
    !Array.isArray(value.indices) ||
    value.indices.length === 0 ||
    !value.indices.every(isIndexMetric) ||
    !Array.isArray(value.traceEvents) ||
    value.traceEvents.length === 0 ||
    !value.traceEvents.every(isTraceEvent) ||
    !Array.isArray(value.citations) ||
    !value.citations.every(isSourceCitation)
  ) {
    throw new TypeError("Invalid demo case");
  }

  return value as unknown as DemoCase;
}

export function isSyntheticProposal(value: unknown): value is SyntheticProposal {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["placeholder", "attributed", "message"]) &&
    value.placeholder === true &&
    value.attributed === false &&
    typeof value.message === "string" &&
    value.message.trim().length > 0
  );
}

export function isExcerptItem(value: unknown): value is ExcerptItem {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "title",
      "quote",
      "speaker",
      "timestamp",
      "sourceType",
      "logEventId",
    ]) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.quote === "string" &&
    value.quote.trim().length > 0 &&
    typeof value.speaker === "string" &&
    value.speaker.trim().length > 0 &&
    typeof value.timestamp === "string" &&
    value.timestamp.trim().length > 0 &&
    typeof value.sourceType === "string" &&
    value.sourceType.trim().length > 0 &&
    typeof value.logEventId === "string" &&
    value.logEventId.trim().length > 0
  );
}

export function isRelatedContextItem(value: unknown): value is RelatedContextItem {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "title", "description", "reference"]) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.description === "string" &&
    value.description.trim().length > 0 &&
    typeof value.reference === "string" &&
    value.reference.trim().length > 0
  );
}

export function isIndexMetric(value: unknown): value is IndexMetric {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "name",
      "value",
      "max",
      "rubric",
      "justification",
      "heuristicLabel",
      "logEventId",
    ]) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.value === "number" &&
    Number.isInteger(value.value) &&
    value.value >= 0 &&
    value.value <= 100 &&
    typeof value.max === "number" &&
    Number.isInteger(value.max) &&
    value.max === 100 &&
    typeof value.rubric === "string" &&
    value.rubric.trim().length > 0 &&
    typeof value.justification === "string" &&
    value.justification.trim().length > 0 &&
    typeof value.heuristicLabel === "string" &&
    value.heuristicLabel.trim().length > 0 &&
    typeof value.logEventId === "string" &&
    value.logEventId.trim().length > 0
  );
}

export function isTraceEvent(value: unknown): value is TraceEvent {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "stage",
      "timestamp",
      "title",
      "description",
      "canonicalHash",
      "status",
      "details",
    ]) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    isTraceStage(value.stage) &&
    typeof value.timestamp === "string" &&
    value.timestamp.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.description === "string" &&
    value.description.trim().length > 0 &&
    typeof value.canonicalHash === "string" &&
    value.canonicalHash.trim().length > 0 &&
    typeof value.status === "string" &&
    value.status.trim().length > 0 &&
    typeof value.details === "string" &&
    value.details.trim().length > 0
  );
}

export function isSourceCitation(value: unknown): value is SourceCitation {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "title", "url", "publisher", "type"]) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.url === "string" &&
    value.url.trim().length > 0 &&
    typeof value.publisher === "string" &&
    value.publisher.trim().length > 0 &&
    typeof value.type === "string" &&
    value.type.trim().length > 0
  );
}

export interface EvidenceExcerpt {
  id: string;
  institution: string;
  collection: string;
  title: string;
  version: string;
  sourceUrl: string;
  retrievalDate: string;
  citationLocation: string;
  license: string;
  coverageLimits: string;
  excerpt: string;
  sha256: string;
  period?: string;
  type?: string;
  score?: number;
}

export function isEvidenceExcerpt(value: unknown): value is EvidenceExcerpt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.institution === "string" &&
    value.institution.trim().length > 0 &&
    typeof value.collection === "string" &&
    value.collection.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.version === "string" &&
    value.version.trim().length > 0 &&
    typeof value.sourceUrl === "string" &&
    value.sourceUrl.trim().length > 0 &&
    typeof value.retrievalDate === "string" &&
    value.retrievalDate.trim().length > 0 &&
    typeof value.citationLocation === "string" &&
    value.citationLocation.trim().length > 0 &&
    typeof value.license === "string" &&
    value.license.trim().length > 0 &&
    typeof value.coverageLimits === "string" &&
    value.coverageLimits.trim().length > 0 &&
    typeof value.excerpt === "string" &&
    value.excerpt.trim().length > 0 &&
    typeof value.sha256 === "string" &&
    value.sha256.trim().length > 0 &&
    (value.period === undefined || typeof value.period === "string") &&
    (value.type === undefined || typeof value.type === "string") &&
    (value.score === undefined || typeof value.score === "number")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value);
  return valueKeys.length === keys.length && valueKeys.every((key) => keys.includes(key));
}

