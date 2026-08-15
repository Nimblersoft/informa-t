// # Spec: docs/specs/url-analysis.md

export const MAX_ARTICLE_BYTES = 1_000_000;
export const ARTICLE_FETCH_TIMEOUT_MS = 8_000;
export const MAX_ARTICLE_REDIRECTS = 3;

export type ArticleFetchDiagnosticCategory =
  | "unsafe_target"
  | "redirect"
  | "http_status"
  | "transport"
  | "timeout"
  | "content_type"
  | "size_limit"
  | "empty"
  | "browser_unavailable";

export class ArticleFetchError extends Error {
  constructor(message: string, readonly diagnosticCategory: ArticleFetchDiagnosticCategory) {
    super(message);
    this.name = "ArticleFetchError";
  }
}

type DnsResolver = (hostname: string, signal: AbortSignal) => Promise<readonly string[]>;
type BrowserRunContentBinding = Pick<BrowserRun, "quickAction">;

export interface ArticleFetchOptions {
  fetchImpl?: typeof fetch;
  resolveHostname?: DnsResolver;
  signal?: AbortSignal;
  timeoutMs?: number;
  browser?: BrowserRunContentBinding;
}

export async function fetchArticleText(url: string, options: ArticleFetchOptions = {}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHostname = options.resolveHostname ?? resolveHostnameWithDoh;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? ARTICLE_FETCH_TIMEOUT_MS);
  const deadline = Date.now() + (options.timeoutMs ?? ARTICLE_FETCH_TIMEOUT_MS);

  try {
    let current = new URL(url);
    for (let redirect = 0; redirect <= MAX_ARTICLE_REDIRECTS; redirect += 1) {
      await withTimeout(assertSafeArticleUrl(current, controller.signal, resolveHostname), deadline - Date.now(), controller);
      let response: Response;
      try {
        response = await withTimeout(fetchImpl(current, { signal: controller.signal, redirect: "manual" }), deadline - Date.now(), controller);
      } catch (error) {
        if (controller.signal.aborted) throw new ArticleFetchError("La recuperación del artículo agotó el tiempo disponible.", "timeout");
        throw new ArticleFetchError("No se pudo conectar con la fuente del artículo.", "transport");
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === MAX_ARTICLE_REDIRECTS) throw new ArticleFetchError("El artículo redirige demasiadas veces o a una ubicación no válida.", "redirect");
        try {
          current = new URL(location, current);
        } catch {
          throw new ArticleFetchError("El artículo redirige demasiadas veces o a una ubicación no válida.", "redirect");
        }
        continue;
      }
      if (!response.ok) {
        if (options.browser) return fetchRenderedArticle(current.toString(), options.browser, deadline, options.signal);
        throw new ArticleFetchError("La fuente rechazó la recuperación directa y no hay extracción renderizada disponible.", "http_status");
      }
      if (!isReadableContentType(response.headers.get("content-type"))) {
        if (options.browser) return fetchRenderedArticle(current.toString(), options.browser, deadline, options.signal);
        throw new ArticleFetchError("La URL no contiene HTML o texto legible.", "content_type");
      }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_ARTICLE_BYTES) {
        throw new ArticleFetchError("El artículo supera el límite de tamaño permitido.", "size_limit");
      }
      let body: string;
      try {
        body = await withTimeout(readResponseBody(response, MAX_ARTICLE_BYTES), deadline - Date.now(), controller);
      } catch (error) {
        if (error instanceof ArticleFetchError) throw error;
        if (controller.signal.aborted) throw new ArticleFetchError("La recuperación del artículo agotó el tiempo disponible.", "timeout");
        throw new ArticleFetchError("No se pudo leer el cuerpo del artículo.", "transport");
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const text = contentType.includes("html") ? extractReadableText(body) : decodeEntities(body).trim();
      if (text.length === 0) {
        if (options.browser) return fetchRenderedArticle(current.toString(), options.browser, deadline, options.signal);
        throw new ArticleFetchError("No se encontró texto legible en el artículo.", "empty");
      }
      return text;
    }
  } catch (error) {
    if (error instanceof ArticleFetchError) throw error;
    if (controller.signal.aborted) throw new ArticleFetchError("La recuperación del artículo agotó el tiempo disponible.", "timeout");
    throw new ArticleFetchError("No se pudo leer el artículo.", "transport");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
  throw new Error("No se pudo leer el artículo.");
}

export async function assertSafeArticleUrl(url: URL, signal: AbortSignal, resolveHostname: DnsResolver = resolveHostnameWithDoh): Promise<void> {
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || !url.hostname) {
    throw new ArticleFetchError("La URL debe usar HTTP o HTTPS y no incluir credenciales.", "unsafe_target");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isBlockedHostname(hostname) || isPrivateIp(hostname)) {
    throw new ArticleFetchError("La URL apunta a una red privada o local y no puede recuperarse.", "unsafe_target");
  }
  const addresses = await resolveHostname(hostname, signal);
  if (addresses.some(isPrivateIp)) throw new ArticleFetchError("La URL apunta a una red privada o local y no puede recuperarse.", "unsafe_target");
}

export function isPrivateIp(value: string): boolean {
  const host = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIpv4(host)) {
    const [a, b, c] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) || (a === 198 && b >= 18 && b <= 19) || a >= 224;
  }
  if (!host.includes(":")) return false;
  if (host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;
  const mapped = host.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  return mapped ? isPrivateIp(mapped) : false;
}

export function extractReadableText(html: string): string {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  return decodeEntities(article
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isBlockedHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "metadata.google.internal" || hostname === "metadata";
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

function isReadableContentType(contentType: string | null): boolean {
  const type = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return type === "text/html" || type === "text/plain" || type === "application/xhtml+xml";
}

async function readResponseBody(response: Response, cap: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > cap) throw new ArticleFetchError("El artículo supera el límite de tamaño permitido.", "size_limit");
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      throw new ArticleFetchError("El artículo supera el límite de tamaño permitido.", "size_limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchRenderedArticle(url: string, browser: BrowserRunContentBinding, deadline: number, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const remaining = deadline - Date.now();
  try {
    const response = await withTimeout(
      browser.quickAction("content", {
        url,
        gotoOptions: { waitUntil: "networkidle2", timeout: Math.min(60_000, Math.max(1, remaining)) },
        actionTimeout: Math.min(120_000, Math.max(1, remaining)),
      }),
      remaining,
      controller,
    );
    if (!response.ok) throw new ArticleFetchError("No fue posible extraer el artículo con el navegador renderizado.", "browser_unavailable");
    const payload = JSON.parse(await withTimeout(readResponseBody(response, MAX_ARTICLE_BYTES), remaining, controller)) as { success?: boolean; result?: unknown };
    if (payload.success !== true || typeof payload.result !== "string") {
      throw new ArticleFetchError("No fue posible extraer el artículo con el navegador renderizado.", "browser_unavailable");
    }
    const text = extractReadableText(payload.result);
    if (text.length === 0) throw new ArticleFetchError("No se encontró texto legible en el artículo renderizado.", "empty");
    return text;
  } catch (error) {
    if (error instanceof ArticleFetchError) throw error;
    if (controller.signal.aborted) throw new ArticleFetchError("La extracción renderizada agotó el tiempo disponible.", "timeout");
    throw new ArticleFetchError("No fue posible extraer el artículo con el navegador renderizado.", "browser_unavailable");
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

async function resolveHostnameWithDoh(hostname: string, signal: AbortSignal): Promise<readonly string[]> {
  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal,
    });
    if (!response.ok) throw new Error("No se pudo verificar la seguridad de la URL.");
    const payload = (await response.json()) as { Answer?: Array<{ type?: number; data?: string }> };
    addresses.push(...(payload.Answer ?? []).filter((answer) => answer.type === (type === "A" ? 1 : 28) && typeof answer.data === "string").map((answer) => answer.data as string));
  }
  return addresses;
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? match;
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  if (timeoutMs <= 0) {
    controller.abort();
    throw new Error("La recuperación del artículo agotó el tiempo disponible.");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("La recuperación del artículo agotó el tiempo disponible."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
