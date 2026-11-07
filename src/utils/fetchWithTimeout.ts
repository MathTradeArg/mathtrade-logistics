export const NETWORK_ERROR_MESSAGE =
  'No hay conexión o el servidor tardó demasiado. Probá de nuevo.';

export class NetworkError extends Error {
  status = 0;
  body: unknown = null;

  constructor() {
    super(NETWORK_ERROR_MESSAGE);
    this.name = 'NetworkError';
  }
}

export type FetchTimeoutOptions = { timeoutMs?: number; retries?: number; retryDelayMs?: number };

const RETRY_STATUS = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** fetch with a timeout (AbortController). Retries only on network errors,
 *  timeouts and 502/503/504, `retries` times; callers pass retries > 0 for
 *  GET only. Resolves with the Response (even for 4xx/5xx); rejects with
 *  NetworkError. The timeout covers the response headers, not the body. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { timeoutMs = 15000, retries = 0, retryDelayMs = 500 }: FetchTimeoutOptions = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(input, { ...init, signal: controller.signal });
    } catch {
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }
    if (RETRY_STATUS.has(response.status) && attempt < retries) {
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    }
    return response;
  }
}

/** `detail || message` of an API error body, else `fallback`. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  const payload = body as { detail?: unknown; message?: unknown } | null;
  if (payload && typeof payload.detail === 'string' && payload.detail) return payload.detail;
  if (payload && typeof payload.message === 'string' && payload.message) return payload.message;
  return fallback;
}
