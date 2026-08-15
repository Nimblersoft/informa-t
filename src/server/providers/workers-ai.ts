// Spec: docs/specs/text-analysis-engine.md

export interface WorkersAiBinding {
  run(model: string, input: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
}

export interface WorkersAiEnvironment {
  AI: WorkersAiBinding;
}

export interface WorkersAiJsonResult<T> {
  value?: T;
  error?: { code: "timeout" | "quota" | "outage" | "invalid_response"; limitation: string };
  repaired: boolean;
}

export async function runJsonWithSingleRepair<T>(options: {
  ai: WorkersAiBinding;
  model: string;
  input: unknown;
  repairInput: (invalidResponse: string) => unknown;
  guard: (value: unknown) => value is T;
  signal: AbortSignal;
}): Promise<WorkersAiJsonResult<T>> {
  let response: unknown;
  try {
    response = await options.ai.run(options.model, options.input, { signal: options.signal });
  } catch (error) {
    return { error: classifyModelError(error), repaired: false };
  }

  const parsed = parseJsonResponse(response);
  if (parsed !== undefined && options.guard(parsed)) {
    return { value: parsed, repaired: false };
  }

  let repairedResponse: unknown;
  try {
    repairedResponse = await options.ai.run(options.model, options.repairInput(stringifyResponse(response)), {
      signal: options.signal,
    });
  } catch (error) {
    return { error: classifyModelError(error), repaired: true };
  }

  const repaired = parseJsonResponse(repairedResponse);
  if (repaired !== undefined && options.guard(repaired)) {
    return { value: repaired, repaired: true };
  }

  return {
    error: {
      code: "invalid_response",
      limitation: "El modelo devolvió una respuesta estructurada inválida después de un único intento de reparación.",
    },
    repaired: true,
  };
}

function parseJsonResponse(value: unknown): unknown | undefined {
  const candidate =
    typeof value === "object" && value !== null && "response" in value
      ? (value as { response?: unknown }).response
      : value;

  if (typeof candidate === "string") {
    try {
      return JSON.parse(candidate);
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
