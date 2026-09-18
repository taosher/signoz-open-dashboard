/**
 * Embed URL 参数解析/序列化（设计文档 §4.1 / §8）。
 * 纯函数、无 DOM 依赖，前后端可共用。
 * 注意：serialize 时不回写 env 默认 key（防泄漏），见设计文档 §8。
 */

export type EmbedTheme = 'light' | 'dark';
export type EmbedLocale = 'zh' | 'en';

export interface ParsedEmbedParams {
  dashboardId: string;
  apiKey?: string;
  from: string;
  to: string;
  theme: EmbedTheme;
  locale: EmbedLocale;
  refresh: string;
  annotations: boolean;
  toolbar: boolean;
  title: boolean;
  fullscreen: boolean;
  vars: Record<string, string>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDashboardId(id: string): boolean {
  return UUID_RE.test(id);
}

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v === null) return fallback;
  return v !== 'false' && v !== '0';
}

/** 脱敏：把 query 对象中的 key 字段替换为 ***（大小写不敏感）。 */
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

export function parseEmbedParams(
  dashboardId: string,
  search: string | URLSearchParams,
): ParsedEmbedParams {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  const vars: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    if (k.startsWith('var-') && k.length > 4) {
      vars[k.slice(4)] = v;
    }
  }

  const themeRaw = (params.get('theme') ?? 'light').toLowerCase();
  const localeRaw = (params.get('locale') ?? 'zh').toLowerCase();

  return {
    dashboardId,
    apiKey: params.get('apiKey') ?? params.get('api_key') ?? undefined,
    from: params.get('from') ?? 'now-6h',
    to: params.get('to') ?? 'now',
    theme: themeRaw === 'dark' ? 'dark' : 'light',
    locale: localeRaw === 'en' ? 'en' : 'zh',
    refresh: params.get('refresh') ?? 'inherit',
    annotations: parseBool(params.get('annotations'), true),
    toolbar: parseBool(params.get('toolbar'), true),
    title: parseBool(params.get('title'), true),
    fullscreen: parseBool(params.get('fullscreen'), false),
    vars,
  };
}

/**
 * 序列化回 URL（供前端 replaceState）。
 * @param includeApiKey 仅当入参自带 key 时保留；env 默认 key 永不回写。
 */
export function serializeEmbedParams(
  p: ParsedEmbedParams,
  opts: { includeApiKey: boolean } = { includeApiKey: false },
): string {
  const s = new URLSearchParams();
  if (opts.includeApiKey && p.apiKey) {
    s.set('apiKey', p.apiKey);
  }
  s.set('from', p.from);
  s.set('to', p.to);
  s.set('theme', p.theme);
  s.set('locale', p.locale);
  if (p.refresh && p.refresh !== 'inherit') s.set('refresh', p.refresh);
  s.set('annotations', String(p.annotations));
  if (!p.toolbar) s.set('toolbar', 'false');
  if (!p.title) s.set('title', 'false');
  if (p.fullscreen) s.set('fullscreen', 'true');
  for (const [k, v] of Object.entries(p.vars)) {
    s.set(`var-${k}`, v);
  }
  return s.toString();
}
