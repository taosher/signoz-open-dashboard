/**
 * Embed URL 参数解析/序列化（设计文档 §4.1 / §8）。
 * 纯函数、无 DOM 依赖，前后端可共用。
 * 注意：serialize 只写原生参数（relativeTime 或 startTime+endTime），
 * `from/to` 仅入口单向兼容翻译，不回写；env 默认 key 永不回写（防泄漏）。
 */

export type EmbedLocale = 'zh' | 'en';

/** 设计文档 §7.2：主题注册表名。未知值回退 `legacy`。 */
export const KNOWN_EMBED_THEMES = ['legacy', 'shadcn'] as const;
export type EmbedThemeName = (typeof KNOWN_EMBED_THEMES)[number];
export const DEFAULT_EMBED_THEME: EmbedThemeName = 'legacy';

/** 深浅色（设计文档 §4.1 `mode`，与主题正交）。 */
export type EmbedMode = 'light' | 'dark';
export const DEFAULT_EMBED_MODE: EmbedMode = 'light';

/** 工具条控制项三态（设计文档 §4.1）：show 显示可用，hidden 不渲染，disabled 置灰。 */
export type ControlVisibility = 'show' | 'hidden' | 'disabled';

export function normalizeControlVisibility(raw: unknown): ControlVisibility {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'hidden' || v === 'disabled') return v;
  return 'show';
}

export interface ParsedEmbedParams {
  dashboardId: string;
  apiKey?: string;
  /** 原生相对时间，如 `30m`；绝对时间模式下为 null。 */
  relativeTime: string | null;
  /** 绝对时间（epoch 秒）。相对模式下为 null。 */
  startTime: number | null;
  endTime: number | null;
  theme: string;
  mode: EmbedMode;
  locale: EmbedLocale;
  refresh: string;
  annotations: boolean;
  toolbar: boolean;
  title: boolean;
  fullscreen: boolean;
  timeControl: ControlVisibility;
  refreshControl: ControlVisibility;
  modeControl: ControlVisibility;
  fullscreenControl: ControlVisibility;
  localeControl: ControlVisibility;
  vars: Record<string, string>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDashboardId(id: string): boolean {
  return UUID_RE.test(id);
}

/** 未知主题回退 `legacy`（设计文档 §4.1 / §7.2，验收用例 #11）。 */
export function normalizeThemeName(raw: unknown): string {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if ((KNOWN_EMBED_THEMES as readonly string[]).includes(v)) return v;
  return DEFAULT_EMBED_THEME;
}

/** 未知 mode 回退 `light`（设计文档 §4.1）。 */
export function normalizeMode(raw: unknown): EmbedMode {
  return String(raw ?? '')
    .trim()
    .toLowerCase() === 'dark'
    ? 'dark'
    : DEFAULT_EMBED_MODE;
}

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v === null) return fallback;
  return v !== 'false' && v !== '0';
}

function parseEpoch(v: string | null): number | null {
  if (v === null) return null;
  const s = v.trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

/**
 * 旧式 `from/to` 单向兼容翻译（设计文档 §4.1）。
 * `now-30m~now` → `{ relativeTime: '30m' }`；纯 `now~now` 视为默认 `30m`；
 * 否则按 epoch 秒解析为绝对时间；解析失败返回 null（调用方用默认）。
 */
export function translateLegacyFromTo(
  from: string | null,
  to: string | null,
): { relativeTime: string } | { startTime: number; endTime: number } | null {
  const rel = (v: string): string | null => {
    const m = /^now(?:-(\d+[smhdw]))?$/.exec(v.trim());
    return m ? (m[1] ?? '') : null;
  };
  if (from !== null && to !== null) {
    const rf = rel(from);
    const rt = rel(to);
    if (rf !== null && rt !== null && (rf !== '' || rt !== '')) {
      return { relativeTime: rf === '' ? '30m' : rf };
    }
    const s = parseEpoch(from);
    const e = parseEpoch(to);
    if (s !== null && e !== null) return { startTime: s, endTime: e };
    return null;
  }
  return null;
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

  // 时间：原生参数优先，旧式 from/to 兼容翻译，默认 30m。
  let relativeTime: string | null = null;
  let startTime: number | null = null;
  let endTime: number | null = null;
  const relRaw = params.get('relativeTime');
  const startRaw = params.get('startTime');
  const endRaw = params.get('startTime') !== null || params.get('endTime') !== null
    ? params.get('endTime')
    : null;
  if (relRaw !== null && relRaw.trim() !== '') {
    relativeTime = relRaw.trim();
  } else if (startRaw !== null || endRaw !== null) {
    const s = parseEpoch(startRaw);
    const e = parseEpoch(endRaw);
    if (s !== null && e !== null) {
      startTime = s;
      endTime = e;
    } else {
      relativeTime = '30m';
    }
  } else {
    const compat = translateLegacyFromTo(params.get('from'), params.get('to'));
    if (compat !== null && 'relativeTime' in compat) {
      relativeTime = compat.relativeTime;
    } else if (compat !== null && 'startTime' in compat) {
      startTime = compat.startTime;
      endTime = compat.endTime;
    } else if (params.get('from') === null && params.get('to') === null) {
      relativeTime = '30m';
    } else {
      relativeTime = '30m';
    }
  }

  const localeRaw = (params.get('locale') ?? 'zh').toLowerCase();

  return {
    dashboardId,
    apiKey: params.get('apiKey') ?? params.get('api_key') ?? undefined,
    relativeTime,
    startTime,
    endTime,
    theme: normalizeThemeName(params.get('theme') ?? DEFAULT_EMBED_THEME),
    mode: normalizeMode(params.get('mode') ?? DEFAULT_EMBED_MODE),
    locale: localeRaw === 'en' ? 'en' : 'zh',
    refresh: params.get('refresh') ?? 'inherit',
    annotations: parseBool(params.get('annotations'), true),
    toolbar: parseBool(params.get('toolbar'), true),
    title: parseBool(params.get('title'), true),
    fullscreen: parseBool(params.get('fullscreen'), false),
    timeControl: normalizeControlVisibility(params.get('timeControl')),
    refreshControl: normalizeControlVisibility(params.get('refreshControl')),
    modeControl: normalizeControlVisibility(params.get('modeControl')),
    fullscreenControl: normalizeControlVisibility(params.get('fullscreenControl')),
    localeControl: normalizeControlVisibility(params.get('localeControl')),
    vars,
  };
}

/**
 * refresh 钳制（设计文档 §4.1）：`off`/`inherit` 原样返回；
 * 时长 `<10s` 钳制到 `10s`，防刷爆。解析失败返回 `inherit`。
 */
export function normalizeRefresh(
  raw: string | null | undefined,
  floorSeconds = 10,
): string {
  if (!raw || raw === 'inherit' || raw === 'off') return raw ?? 'inherit';
  const m = /^(\d+)(s|m|h)?$/.exec(raw.trim());
  if (!m) return 'inherit';
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  const seconds = unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return 'inherit';
  if (seconds < floorSeconds) return `${floorSeconds}s`;
  return raw.trim();
}

/**
 * 序列化回 URL（供前端 replaceState）。
 * 只写原生时间参数；`@param includeApiKey` 仅当入参自带 key 时保留；
 * env 默认 key 永不回写。
 */
export function serializeEmbedParams(
  p: ParsedEmbedParams,
  opts: { includeApiKey: boolean } = { includeApiKey: false },
): string {
  const s = new URLSearchParams();
  if (opts.includeApiKey && p.apiKey) {
    s.set('apiKey', p.apiKey);
  }
  if (p.relativeTime !== null) {
    s.set('relativeTime', p.relativeTime);
  } else if (p.startTime !== null && p.endTime !== null) {
    s.set('startTime', String(p.startTime));
    s.set('endTime', String(p.endTime));
  }
  s.set('theme', p.theme);
  if (p.mode !== DEFAULT_EMBED_MODE) s.set('mode', p.mode);
  s.set('locale', p.locale);
  if (p.refresh && p.refresh !== 'inherit') s.set('refresh', p.refresh);
  if (!p.annotations) s.set('annotations', 'false');
  if (!p.toolbar) s.set('toolbar', 'false');
  if (!p.title) s.set('title', 'false');
  if (p.fullscreen) s.set('fullscreen', 'true');
  if (p.timeControl !== 'show') s.set('timeControl', p.timeControl);
  if (p.refreshControl !== 'show') s.set('refreshControl', p.refreshControl);
  if (p.modeControl !== 'show') s.set('modeControl', p.modeControl);
  if (p.fullscreenControl !== 'show') s.set('fullscreenControl', p.fullscreenControl);
  if (p.localeControl !== 'show') s.set('localeControl', p.localeControl);
  for (const [k, v] of Object.entries(p.vars)) {
    s.set(`var-${k}`, v);
  }
  return s.toString();
}
