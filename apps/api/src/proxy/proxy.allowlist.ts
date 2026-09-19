/**
 * Proxy allowlist (design doc §6.2). Deny by default, forward only when explicitly allowed.
 * Upstream paths are all native SigNoz paths (/api/vX/...); NestJS only strips the /api/signoz prefix.
 */
export type ProxyDecision =
  | { allowed: true }
  | { allowed: false; code: 'EMBED_READONLY' | 'EMBED_BLOCKED' };

const DASHBOARD_ID_RE = /^\/api\/v1\/dashboards\/[^/]+$/;

export function decideProxy(method: string, upstreamPath: string): ProxyDecision {
  const m = method.toUpperCase();
  const p = upstreamPath.split('?')[0];

  // Dashboards: only GET single dashboard is allowed (explicit /lock suffix denial maps to READONLY)
  if (p.startsWith('/api/v1/dashboards')) {
    if (m === 'GET' && DASHBOARD_ID_RE.test(p)) return { allowed: true };
    // Explicit write operations map to READONLY, everything else maps to BLOCKED
    if (
      m === 'POST' ||
      m === 'PUT' ||
      m === 'PATCH' ||
      m === 'DELETE' ||
      p.endsWith('/lock')
    ) {
      return { allowed: false, code: 'EMBED_READONLY' };
    }
    return { allowed: false, code: 'EMBED_BLOCKED' };
  }

  // Query APIs: forward POST
  if (
    m === 'POST' &&
    (p === '/api/v3/query_range' ||
      p === '/api/v3/query_range/format' ||
      p === '/api/v4/query_range' ||
      p === '/api/v5/query_range' ||
      p === '/api/v3/substitute_vars' ||
      p === '/api/v5/substitute_vars' ||
      p === '/api/v2/variables/query')
  ) {
    return { allowed: true };
  }

  // Metadata: forward GET (healthz probes version without the proxy too, but direct frontend calls need it)
  // DYNAMIC variable candidates (design doc §6.2): GET /api/v1/fields/values?signal=&name=
  if (
    m === 'GET' &&
    (p === '/api/v1/version' ||
      p === '/api/v1/features' ||
      p === '/api/v1/fields/values')
  ) {
    return { allowed: true };
  }

  return { allowed: false, code: 'EMBED_BLOCKED' };
}
