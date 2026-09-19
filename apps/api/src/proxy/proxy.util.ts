import { createHash, randomUUID } from 'crypto';

/** Resolve effectiveKey from the request. Priority: header > query > env (design doc §6.2). */
export function resolveEffectiveKey(opts: {
  headerKey?: string;
  queryKey?: string;
  envKey: string;
}): { key: string; source: 'header' | 'query' | 'env' | 'none' } {
  if (opts.headerKey && opts.headerKey.trim() !== '') {
    return { key: opts.headerKey.trim(), source: 'header' };
  }
  if (opts.queryKey && opts.queryKey.trim() !== '') {
    return { key: opts.queryKey.trim(), source: 'query' };
  }
  if (opts.envKey && opts.envKey.trim() !== '') {
    return { key: opts.envKey.trim(), source: 'env' };
  }
  return { key: '', source: 'none' };
}

/** First 8 chars of the key hash, for troubleshooting only; never log the plaintext key. */
export function hashKeyPrefix8(key: string): string {
  if (!key) return 'none';
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/** Sanitize query (case-insensitive) for logs and metric labels. */
export function sanitizeQuery(
  query: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (/^(apikey|api_key|access_token)$/i.test(k)) {
      out[k] = '***';
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function ensureRequestId(incoming?: string): string {
  if (incoming && incoming.trim() !== '') return incoming.trim().slice(0, 64);
  return randomUUID();
}

/** Extract dashboardId from the upstream path (for logs); return undefined on failure. */
export function extractDashboardId(upstreamPath: string): string | undefined {
  const m = upstreamPath.match(/^\/api\/v1\/dashboards\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}
