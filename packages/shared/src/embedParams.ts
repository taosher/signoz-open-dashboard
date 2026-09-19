/**
 * Embed URL param parsing/serialization (design doc §4.1 / §8).
 * Pure functions with no DOM dependency, shared by frontend and backend.
 * Note: serialize only writes native params (relativeTime or startTime+endTime),
 * `from/to` are translated one-way on entry only, never written back; the env default key is never written back (leak protection).
 */

export type EmbedLocale = 'zh' | 'en';

/** Theme registry names (design doc §7.2). Unknown values fall back to the default theme. */
export const KNOWN_EMBED_THEMES = ['legacy', 'shadcn'] as const;
export type EmbedThemeName = (typeof KNOWN_EMBED_THEMES)[number];
export const DEFAULT_EMBED_THEME: EmbedThemeName = 'shadcn';

/** Color scheme (design doc §4.1 `mode`, orthogonal to the theme). */
export type EmbedMode = 'light' | 'dark';
export const DEFAULT_EMBED_MODE: EmbedMode = 'light';

/** Toolbar control tri-state (design doc §4.1): show renders enabled, hidden skips rendering, disabled renders greyed out. */
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
  /** Native relative time, e.g. `30m`; null in absolute-time mode. */
  relativeTime: string | null;
  /** Absolute time (epoch seconds). Null in relative mode. */
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

/** Unknown themes fall back to the default theme (design doc §4.1 / §7.2, acceptance case #11). */
export function normalizeThemeName(raw: unknown): string {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if ((KNOWN_EMBED_THEMES as readonly string[]).includes(v)) return v;
  return DEFAULT_EMBED_THEME;
}

/** Unknown modes fall back to `light` (design doc §4.1). */
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
 * Legacy `from/to` one-way compatibility translation (design doc §4.1).
 * `now-30m~now` → `{ relativeTime: '30m' }`; bare `now~now` defaults to `30m`;
 * otherwise parse as epoch seconds for absolute time; return null on failure (caller applies the default).
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

/** Redaction: replace key fields in the query object with *** (case-insensitive). */
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

  // Time: native params win, legacy from/to are compat-translated, default 30m.
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
 * refresh clamping (design doc §4.1): `off`/`inherit` pass through untouched;
 * durations `<10s` clamp to `10s` to prevent refresh storms. Return `inherit` on parse failure.
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
 * Serialize back to URL (for frontend replaceState).
 * Only writes native time params; `@param includeApiKey` keeps the key only when the input already carries one;
 * the env default key is never written back.
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
