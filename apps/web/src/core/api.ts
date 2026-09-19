/**
 * 同源取数（设计文档 §7.4-2）。一律走 `/api/signoz/*`，
 * 拦截器附 `x-embed-api-key`（内存值，无则不带）。
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
    const err = new Error(`SigNoz 后端不可达/超时：${path}`) as EmbedApiError;
    err.name = 'EmbedApiError';
    err.code = 'EMBED_UPSTREAM_UNAVAILABLE';
    err.httpStatus = 502;
    throw err;
  }
  const text = await res.text();
  const body: unknown = text === '' ? {} : safeJson(text);
  if (!res.ok) {
    throw toError(res.status, body, `请求失败：${path}（${res.status}）`);
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

/** 在 hook 内自动注入内存 Key 的取数封装。 */
export function useApiKey(): string | undefined {
  return useEmbedAuth().apiKey;
}
