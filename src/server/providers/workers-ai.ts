// Spec: docs/specs/model-fallback.md

export interface WorkersAiBinding {
  run(model: string, input: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
}

export type ModelProviderName = "workers-ai" | "openrouter";

export interface ModelProvenance {
  provider: ModelProviderName;
  modelId: string;
}

export interface ModelInvocationBinding extends WorkersAiBinding {}

export interface WorkersAiEnvironment {
  AI: WorkersAiBinding;
}

export interface WorkersAiJsonResult<T> {
  value?: T;
  error?: { code: "timeout" | "quota" | "outage" | "invalid_response"; limitation: string };
  repaired: boolean;
  provenance: ModelProvenance;
  fallback?: {
    attempted: boolean;
    reason: "timeout" | "quota" | "outage" | "invalid_response";
    outcome: "success" | "failed";
    fromProvider: ModelProviderName;
    toProvider: ModelProviderName;
    fromModel: string;
    toModel?: string;
  };
}

export async function runJsonWithSingleRepair<T>(options: {
  ai: ModelInvocationBinding;
  model: string;
  input: unknown;
  repairInput: (invalidResponse: string) => unknown;
  guard: (value: unknown) => value is T;
  signal: AbortSignal;
  provider?: ModelProviderName;
  timeoutMs?: number;
}): Promise<WorkersAiJsonResult<T>> {
  const provenance = { provider: options.provider ?? "workers-ai", modelId: options.model } as const;
  let response: unknown;
  try {
    response = await runInvocation(options.ai, options.model, options.input, options.signal, options.timeoutMs);
  } catch (error) {
    return { error: classifyModelError(error), repaired: false, provenance };
  }

  const parsed = parseJsonResponse(response);
  if (parsed !== undefined && options.guard(parsed)) {
    return { value: parsed, repaired: false, provenance };
  }

  let repairedResponse: unknown;
  try {
    repairedResponse = await runInvocation(options.ai, options.model, options.repairInput(stringifyResponse(response)), options.signal, options.timeoutMs);
  } catch (error) {
    return { error: classifyModelError(error), repaired: true, provenance };
  }

  const repaired = parseJsonResponse(repairedResponse);
  if (repaired !== undefined && options.guard(repaired)) {
    return { value: repaired, repaired: true, provenance };
  }

  return {
    error: {
      code: "invalid_response",
      limitation: "El modelo devolvió una respuesta estructurada inválida después de un único intento de reparación.",
    },
    repaired: true,
    provenance,
  };
}

export async function runJsonWithProviderFallback<T>(options: {
  primary: ModelInvocationBinding;
  primaryModel: string;
  fallback?: { ai: ModelInvocationBinding; model: string };
  input: unknown;
  repairInput: (invalidResponse: string) => unknown;
  guard: (value: unknown) => value is T;
  signal: AbortSignal;
  fallbackUnavailableLimitation: string;
  primaryProvider?: ModelProviderName;
  fallbackProvider?: ModelProviderName;
  fallbackOnInvalidResponse?: boolean;
  timeoutMs?: number;
  fallbackLabel?: string;
}): Promise<WorkersAiJsonResult<T>> {
  const primaryProvider = options.primaryProvider ?? "workers-ai";
  const fallbackProvider = options.fallbackProvider ?? "openrouter";
  const primary = await runJsonWithSingleRepair({
    ai: options.primary,
    model: options.primaryModel,
    input: options.input,
    repairInput: options.repairInput,
    guard: options.guard,
    signal: options.signal,
    provider: primaryProvider,
    timeoutMs: options.timeoutMs,
  });

  if (primary.value || (primary.error?.code === "invalid_response" && !options.fallbackOnInvalidResponse)) return primary;

  if (!options.fallback) {
    return {
      ...primary,
      error: {
        code: primary.error?.code ?? "outage",
        limitation: `${primary.error?.limitation ?? "No se generó una respuesta."} ${options.fallbackUnavailableLimitation}`,
      },
      fallback: {
        attempted: false,
        reason: primary.error?.code ?? "outage",
        outcome: "failed",
        fromProvider: primaryProvider,
        toProvider: fallbackProvider,
        fromModel: options.primaryModel,
      },
    };
  }

  const fallback = await runJsonWithSingleRepair({
    ai: options.fallback.ai,
    model: options.fallback.model,
    input: options.input,
    repairInput: options.repairInput,
    guard: options.guard,
    signal: options.signal,
    provider: fallbackProvider,
    timeoutMs: options.timeoutMs,
  });

  if (fallback.value) {
    return {
      ...fallback,
      fallback: {
        attempted: true,
        reason: primary.error?.code ?? "outage",
        outcome: "success",
        fromProvider: primaryProvider,
        toProvider: fallbackProvider,
        fromModel: options.primaryModel,
        toModel: options.fallback.model,
      },
    };
  }

  return {
    ...fallback,
    error: {
      code: fallback.error?.code ?? "outage",
      limitation: `${primary.error?.limitation ?? "El modelo principal no está disponible."} El respaldo ${options.fallbackLabel ?? "OpenRouter"} también falló; no se generó una propuesta.`,
    },
    fallback: {
      attempted: true,
      reason: primary.error?.code ?? "outage",
      outcome: "failed",
      fromProvider: primaryProvider,
      toProvider: fallbackProvider,
      fromModel: options.primaryModel,
      toModel: options.fallback.model,
    },
  };
}

async function runInvocation(ai: ModelInvocationBinding, model: string, input: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown> {
  if (signal.aborted) throw new DOMException("La solicitud fue cancelada.", "AbortError");
  const invocation = ai.run(model, input, { signal });
  if (timeoutMs === undefined) return invocation;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      invocation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DOMException("La invocación agotó el tiempo disponible.", "AbortError")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function parseJsonResponse(value: unknown): unknown | undefined {
  let candidate: unknown = value;
  if (typeof candidate === "object" && candidate !== null && "response" in candidate) {
    candidate = (candidate as { response?: unknown }).response;
  }
  if (typeof candidate === "object" && candidate !== null && "choices" in candidate) {
    const choices = (candidate as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    candidate = choices?.[0]?.message?.content;
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    const source = fenced ? fenced[1] : trimmed;
    const startIndex = source.indexOf("{");
    const lastIndex = source.lastIndexOf("}");
    const sliced = startIndex >= 0 && lastIndex > startIndex ? source.slice(startIndex, lastIndex + 1) : source;
    try {
      return JSON.parse(sliced);
    } catch {
      return undefined;
    }
  }

  return candidate;
}

function stringifyResponse(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[respuesta no serializable]";
  }
}

function classifyModelError(error: unknown): NonNullable<WorkersAiJsonResult<never>["error"]> {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (error instanceof DOMException && error.name === "AbortError" || normalized.includes("timeout")) {
    return { code: "timeout", limitation: "El modelo agotó el tiempo disponible para el análisis." };
  }
  if (normalized.includes("quota") || normalized.includes("429") || normalized.includes("rate limit")) {
    return { code: "quota", limitation: "El modelo no está disponible por límite de cuota. No se generó una propuesta." };
  }
  return { code: "outage", limitation: "El modelo no está disponible temporalmente. No se generó una propuesta." };
}
