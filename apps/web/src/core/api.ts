/**
 * Same-origin fetching (design doc §7.4-2). Always via `/api/signoz/*`,
 * with an interceptor attaching `x-embed-api-key` (in-memory value, omitted when absent).
 */
import type { EmbedErrorBody, EmbedErrorCode } from '@signoz-open-dashboard/shared';
import { useEmbedAuth } from './auth';

export interface EmbedApiError extends Error {
  code: EmbedErrorCode;
  httpStatus: number;
  requestId?: string;
}

function toError(status: number, body: unknown, fallback: string): EmbedApiError {
  const b = (body ?? {}) as Partial<EmbedErrorBody>;
  const err = new Error(typeof b.message === 'string' && b.message !== '' ? b.message : fallback) as EmbedApiError;
  err.name = 'EmbedApiError';
  err.code = (b.code as EmbedErrorCode) ?? 'EMBED_UPSTREAM_UNAVAILABLE';
  err.httpStatus = status;
  err.requestId = typeof b.requestId === 'string' ? b.requestId : undefined;
  return err;
}

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    apiKey?: string;
  } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/signoz${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(opts.apiKey ? { 'x-embed-api-key': opts.apiKey } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    const err = new Error(`SigNoz backend unreachable/timed out: ${path}`) as EmbedApiError;
    err.name = 'EmbedApiError';
    err.code = 'EMBED_UPSTREAM_UNAVAILABLE';
    err.httpStatus = 502;
    throw err;
  }
  const text = await res.text();
  const body: unknown = text === '' ? {} : safeJson(text);
  if (!res.ok) {
    throw toError(res.status, body, `Request failed: ${path} (${res.status})`);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

/** Fetch wrapper that auto-injects the in-memory Key inside hooks. */
export function useApiKey(): string | undefined {
  return useEmbedAuth().apiKey;
}
