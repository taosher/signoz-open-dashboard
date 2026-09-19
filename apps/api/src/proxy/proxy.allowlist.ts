/**
 * 代理白名单（设计文档 §6.2）。默认拒绝，显式允许才透传。
 * 上游 path 均为 SigNoz 原生 path（/api/vX/...），NestJS 仅剥离 /api/signoz 前缀。
 */
export type ProxyDecision =
  | { allowed: true }
  | { allowed: false; code: 'EMBED_READONLY' | 'EMBED_BLOCKED' };

const DASHBOARD_ID_RE = /^\/api\/v1\/dashboards\/[^/]+$/;

export function decideProxy(method: string, upstreamPath: string): ProxyDecision {
  const m = method.toUpperCase();
  const p = upstreamPath.split('?')[0];

  // Dashboard：仅允许 GET 单个（含 /lock 后缀显式拒绝为 READONLY）
  if (p.startsWith('/api/v1/dashboards')) {
    if (m === 'GET' && DASHBOARD_ID_RE.test(p)) return { allowed: true };
    // 明确的写操作提示 READONLY，其余一律 BLOCKED
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

  // 查询类：POST 透传
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

  // 元信息：GET 透传（healthz 探测 version 不经过代理也可用，但前端直调时需要）
  // DYNAMIC 型变量候选（设计文档 §6.2）：GET /api/v1/fields/values?signal=&name=
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
