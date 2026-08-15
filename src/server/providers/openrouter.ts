// Spec: docs/specs/model-fallback.md

import type { ModelInvocationBinding } from "./workers-ai";

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions" as const;

export interface OpenRouterEnvironment {
  OPENROUTER_API_KEY?: string;
}

export type OpenRouterTransport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OpenRouterClientOptions {
  env: OpenRouterEnvironment;
  transport?: OpenRouterTransport;
  endpoint?: string;
}

export interface OpenRouterModelProvider extends ModelInvocationBinding {
  readonly isConfigured?: boolean;
}

interface OpenRouterChatCompletion {
  choices?: Array<{ message?: { content?: unknown } }>;
}

export class OpenRouterClient implements OpenRouterModelProvider {
  readonly isConfigured: boolean;
  private readonly apiKey?: string;
  private readonly transport: OpenRouterTransport;
  private readonly endpoint: string;

  constructor(options: OpenRouterClientOptions) {
    this.apiKey = options.env.OPENROUTER_API_KEY?.trim() || undefined;
    this.isConfigured = this.apiKey !== undefined;
    this.transport = options.transport ?? fetch;
    this.endpoint = options.endpoint ?? OPENROUTER_CHAT_COMPLETIONS_URL;
  }

  async run(model: string, input: unknown, options?: { signal?: AbortSignal }): Promise<unknown> {
    if (!this.apiKey) throw new Error("OpenRouter no está configurado");

    const payload = input as { messages?: unknown };
    const response = await this.transport(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, messages: payload.messages, response_format: { type: "json_object" } }),
      signal: options?.signal,
    });

    if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);

    const completion = (await response.json()) as OpenRouterChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    return { response: typeof content === "string" ? content : content ?? "" };
  }
}
