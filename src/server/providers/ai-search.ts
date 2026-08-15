// Spec: docs/specs/ai-search-provider.md

import type { EvidenceExcerpt, JsonValue, TraceEvent } from "../../shared/contracts";
import { hashCanonicalJson, redactTrace } from "../../shared/trace";

export const OFFICIAL_AI_SEARCH_INSTANCE = "informa-t-oficial" as const;

export interface AiSearchFilterOptions {
  institution?: string;
  collection?: string;
  period?: string;
  type?: string;
}

export interface AiSearchQueryParams {
  query: string;
  filters?: AiSearchFilterOptions;
  maxResults?: number;
}

export interface AiSearchChunk {
  id?: string;
  text?: string;
  content?: string;
  excerpt?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  item?: {
    key?: string;
    metadata?: Record<string, unknown>;
    timestamp?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AiSearchResponse {
  results?: AiSearchChunk[];
  data?: AiSearchChunk[];
  chunks?: AiSearchChunk[];
  response?: string;
  search_query?: string;
  [key: string]: unknown;
}

export interface AiSearchUploadItemOptions {
  metadata?: Record<string, unknown>;
  pollIntervalMs?: number;
  timeoutMs?: number;
  [key: string]: unknown;
}

export interface AiSearchInstanceItems {
  uploadAndPoll(
    name: string,
    content: string | Record<string, unknown> | { text: string; metadata?: Record<string, unknown> },
    options?: AiSearchUploadItemOptions,
  ): Promise<unknown>;
}

export interface AiSearchInstance {
  items: AiSearchInstanceItems;
  search(options: {
    messages?: Array<{ role: string; content: string }>;
    query?: string;
    ai_search_options?: Record<string, unknown>;
  }): Promise<AiSearchResponse>;
}

export interface AiSearchNamespaceBinding {
  get(instanceName: string): AiSearchInstance;
}

export type EvidenceRetrievalOutcome = "Evidencia encontrada" | "Evidencia insuficiente";

export interface AiSearchProviderResult {
  outcome: EvidenceRetrievalOutcome;
  excerpts: EvidenceExcerpt[];
  limitations: string[];
  traceEvents: TraceEvent[];
}

export interface AiSearchProviderOptions {
  binding: AiSearchNamespaceBinding;
  instanceName?: string;
  traceSink?: (event: TraceEvent) => void;
}

const REQUIRED_METADATA_FIELDS: ReadonlyArray<keyof Omit<EvidenceExcerpt, "period" | "type" | "score">> = [
  "id",
  "institution",
  "collection",
  "title",
  "version",
  "sourceUrl",
  "retrievalDate",
  "citationLocation",
  "license",
  "coverageLimits",
  "sha256",
  "excerpt",
];

export class AiSearchProvider {
  private readonly binding: AiSearchNamespaceBinding;
  private readonly instanceName: string;
  private readonly traceSink?: (event: TraceEvent) => void;

  constructor(options: AiSearchProviderOptions) {
    if (!options.binding || typeof options.binding.get !== "function") {
      throw new TypeError("AiSearchProvider requires a valid AI_SEARCH namespace binding with .get() method");
    }
    this.binding = options.binding;
    this.instanceName = options.instanceName ?? OFFICIAL_AI_SEARCH_INSTANCE;
    this.traceSink = options.traceSink;
  }

  getInstance(): AiSearchInstance {
    return this.binding.get(this.instanceName);
  }

  async searchEvidence(params: AiSearchQueryParams): Promise<AiSearchProviderResult> {
    const limitations: string[] = [];
    const traceEvents: TraceEvent[] = [];

    const instance = this.getInstance();

    const filters: Record<string, string> = {};
    if (params.filters) {
      if (typeof params.filters.institution === "string" && params.filters.institution.trim().length > 0) {
        filters.institution = params.filters.institution.trim();
      }
      if (typeof params.filters.collection === "string" && params.filters.collection.trim().length > 0) {
        filters.collection = params.filters.collection.trim();
      }
      if (typeof params.filters.period === "string" && params.filters.period.trim().length > 0) {
        filters.period = params.filters.period.trim();
      }
      if (typeof params.filters.type === "string" && params.filters.type.trim().length > 0) {
        filters.type = params.filters.type.trim();
      }
    }

    const maxNumResults = Math.min(Math.max(1, params.maxResults ?? 5), 5);

    const aiSearchOptions: Record<string, unknown> = {
      max_num_results: maxNumResults,
    };

    if (Object.keys(filters).length > 0) {
      aiSearchOptions.filters = filters;
    }

    let searchResponse: AiSearchResponse;
    try {
      searchResponse = await instance.search({
        messages: [{ role: "user", content: params.query }],
        ai_search_options: aiSearchOptions,
      });
    } catch (error) {
      const errorMsg = `Error al consultar el servicio AI Search (${this.instanceName}): ${error instanceof Error ? error.message : String(error)}`;
      limitations.push(errorMsg);

      const outcome: EvidenceRetrievalOutcome = "Evidencia insuficiente";
      const traceEvent = await this.buildTraceEvent({
        query: params.query,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        retrievedCount: 0,
        validExcerptsCount: 0,
        outcome,
        limitations,
      });
      traceEvents.push(traceEvent);
      this.traceSink?.(traceEvent);

      return {
        outcome,
        excerpts: [],
        limitations,
        traceEvents,
      };
    }

    const rawList = Array.isArray(searchResponse.results)
      ? searchResponse.results
      : Array.isArray(searchResponse.chunks)
        ? searchResponse.chunks
        : Array.isArray(searchResponse.data)
          ? searchResponse.data
          : [];

    const cappedChunks = rawList.slice(0, 5);

    if (cappedChunks.length === 0) {
      limitations.push("No se encontraron fragmentos de evidencia oficial en el índice para la consulta proporcionada.");
    }

    const validExcerpts: EvidenceExcerpt[] = [];
    let hasMissingAttributes = false;

    for (const [index, chunk] of cappedChunks.entries()) {
      const itemObj =
        chunk.item && typeof chunk.item === "object" && !Array.isArray(chunk.item)
          ? (chunk.item as Record<string, unknown>)
          : undefined;

      const meta = (
        itemObj?.metadata && typeof itemObj.metadata === "object" && !Array.isArray(itemObj.metadata)
          ? itemObj.metadata
          : chunk.metadata && typeof chunk.metadata === "object" && !Array.isArray(chunk.metadata)
            ? chunk.metadata
            : chunk
      ) as Record<string, unknown>;

      const text =
        (typeof chunk.text === "string" && chunk.text.trim()) ||
        (typeof chunk.content === "string" && chunk.content.trim()) ||
        (typeof chunk.excerpt === "string" && chunk.excerpt.trim()) ||
        (typeof meta.excerpt === "string" && meta.excerpt.trim()) ||
        (typeof meta.text === "string" && meta.text.trim()) ||
        "";

      const chunkId =
        (typeof chunk.id === "string" && chunk.id.trim()) ||
        (typeof itemObj?.key === "string" && itemObj.key.trim()) ||
        (typeof meta.id === "string" && meta.id.trim()) ||
        "";

      const candidate: Record<string, unknown> = {
        id: chunkId,
        institution: typeof meta.institution === "string" ? meta.institution.trim() : "",
        collection: typeof meta.collection === "string" ? meta.collection.trim() : "",
        title: typeof meta.title === "string" ? meta.title.trim() : "",
        version: typeof meta.version === "string" ? meta.version.trim() : "",
        sourceUrl: typeof meta.sourceUrl === "string" ? meta.sourceUrl.trim() : "",
        retrievalDate: typeof meta.retrievalDate === "string" ? meta.retrievalDate.trim() : "",
        citationLocation: typeof meta.citationLocation === "string" ? meta.citationLocation.trim() : "",
        license: typeof meta.license === "string" ? meta.license.trim() : "",
        coverageLimits: typeof meta.coverageLimits === "string" ? meta.coverageLimits.trim() : "",
        sha256: typeof meta.sha256 === "string" ? meta.sha256.trim() : "",
        excerpt: text,
      };

      const missingKeys: string[] = [];
      for (const field of REQUIRED_METADATA_FIELDS) {
        const val = candidate[field];
        if (typeof val !== "string" || val.length === 0) {
          missingKeys.push(field);
        }
      }

      if (missingKeys.length > 0) {
        hasMissingAttributes = true;
        limitations.push(
          `Fragmento [${index}] descartado por metadatos incompletos. Campos faltantes requeridos: ${missingKeys.join(", ")}.`,
        );
      } else if (!isRelevantEvidence(params.query, candidate)) {
        limitations.push(`Fragmento [${index}] descartado por relevancia insuficiente para la aseveración.`);
      } else {
        const excerptItem: EvidenceExcerpt = {
          id: candidate.id as string,
          institution: candidate.institution as string,
          collection: candidate.collection as string,
          title: candidate.title as string,
          version: candidate.version as string,
          sourceUrl: candidate.sourceUrl as string,
          retrievalDate: candidate.retrievalDate as string,
          citationLocation: candidate.citationLocation as string,
          license: candidate.license as string,
          coverageLimits: candidate.coverageLimits as string,
          sha256: candidate.sha256 as string,
          excerpt: candidate.excerpt as string,
        };

        if (typeof meta.period === "string" && meta.period.trim().length > 0) {
          excerptItem.period = meta.period.trim();
        }
        if (typeof meta.type === "string" && meta.type.trim().length > 0) {
          excerptItem.type = meta.type.trim();
        }
        if (typeof chunk.score === "number") {
          excerptItem.score = chunk.score;
        } else if (typeof meta.score === "number") {
          excerptItem.score = meta.score;
        }

        validExcerpts.push(excerptItem);
      }
    }

    const outcome: EvidenceRetrievalOutcome =
      cappedChunks.length === 0 || hasMissingAttributes || validExcerpts.length === 0
        ? "Evidencia insuficiente"
        : "Evidencia encontrada";

    const returnedExcerpts = outcome === "Evidencia insuficiente" ? [] : validExcerpts;

    const traceEvent = await this.buildTraceEvent({
      query: params.query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      retrievedCount: cappedChunks.length,
      validExcerptsCount: returnedExcerpts.length,
      outcome,
      limitations: limitations.length > 0 ? limitations : undefined,
    });

    traceEvents.push(traceEvent);
    this.traceSink?.(traceEvent);

    return {
      outcome,
      excerpts: returnedExcerpts,
      limitations,
      traceEvents,
    };
  }

  private async buildTraceEvent(payload: {
    query: string;
    filters?: Record<string, string>;
    retrievedCount: number;
    validExcerptsCount: number;
    outcome: EvidenceRetrievalOutcome;
    limitations?: string[];
  }): Promise<TraceEvent> {
    const tracePayload: Record<string, unknown> = {
      instanceName: this.instanceName,
      query: payload.query,
      filters: payload.filters ?? null,
      retrievedCount: payload.retrievedCount,
      validExcerptsCount: payload.validExcerptsCount,
      outcome: payload.outcome,
      limitations: payload.limitations ?? [],
    };

    const redacted = redactTrace(tracePayload as JsonValue);
    const canonicalHash = await hashCanonicalJson(redacted);

    return {
      id: `trace-extract-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      stage: "Extracción",
      timestamp: new Date().toISOString(),
      title: "Recuperación de evidencia oficial en AI Search",
      description: `Búsqueda en ${this.instanceName} finalizada con resultado: ${payload.outcome}.`,
      canonicalHash,
      status: payload.outcome === "Evidencia encontrada" ? "Completado" : "Evidencia insuficiente",
      details: JSON.stringify(redacted),
    };
  }
}

function isRelevantEvidence(query: string, candidate: Record<string, unknown>): boolean {
  const queryTerms = [...meaningfulTerms(query)];
  const metadataTerms = meaningfulTerms([
    candidate.institution,
    candidate.collection,
    candidate.title,
  ].filter((value): value is string => typeof value === "string").join(" "));
  const evidenceTerms = meaningfulTerms([
    candidate.institution,
    candidate.collection,
    candidate.title,
    candidate.excerpt,
  ].filter((value): value is string => typeof value === "string").join(" "));
  if (queryTerms.length === 0) return false;
  if (queryTerms.some((term) => term.length >= 7 && metadataTerms.has(term))) return true;
  const overlap = queryTerms.filter((term) => evidenceTerms.has(term)).length;
  const minimumOverlap = queryTerms.length < 3 ? queryTerms.length : 2;
  return overlap >= minimumOverlap && (queryTerms.length < 4 || overlap / queryTerms.length >= 0.25);
}

function meaningfulTerms(value: string): Set<string> {
  const stopWords = new Set([
    "para", "como", "desde", "entre", "sobre", "este", "esta", "estos", "estas", "que", "por", "con", "una", "uno", "unos", "unas", "del", "los", "las", "el", "la", "en", "de", "y", "o", "al", "se", "su", "sus", "fue", "son", "ser", "durante",
  ]);
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return new Set((normalized.match(/[a-z0-9]{3,}/g) ?? []).filter((term) => !stopWords.has(term)));
}

export function createAiSearchProvider(options: AiSearchProviderOptions): AiSearchProvider {
  return new AiSearchProvider(options);
}
