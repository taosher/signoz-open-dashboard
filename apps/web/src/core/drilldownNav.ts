/**
 * In-place drill-down navigation for the embed.
 *
 * Native SigNoz opens context links in a new tab, which is wrong inside an iframe: the host
 * page loses context. Here a link may instead point at **another dashboard in the same embed**
 * (`/embed/<dashboardId>` or `?dashboard=<id>`), and the embed navigates to it in place, carrying
 * the clicked scope across as `var-*` parameters.
 *
 * Pure functions only, so the rewrite rules are testable without a DOM.
 */

export interface DrilldownTarget {
  /** Dashboard to open. */
  dashboardId: string;
  /** Query parameters for the target embed, already resolved and filtered. */
  params: URLSearchParams;
  /** True when the link stays inside this embed (in-place) rather than leaving to an external page. */
  internal: boolean;
}

const EMBED_PATH_RE = /\/embed\/([0-9a-f-]{36})/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Params that must never be copied into a same-dashboard rewrite (they would reset the target). */
const DROP_PARAMS = new Set(['apikey', 'api_key', 'dashboard']);

/**
 * Rewrites a resolved context-link URL into an embed navigation target.
 *
 * Recognised as internal when the URL contains `/embed/<uuid>` (absolute or relative) or carries
 * `?dashboard=<uuid>`. Everything else returns `internal: false` so the caller can fall back to
 * opening a new tab, exactly like native.
 */
export function parseDrilldownTarget(
  url: string,
  fallbackDashboardId: string,
): DrilldownTarget {
  const embedMatch = EMBED_PATH_RE.exec(url);
  const questionMark = url.indexOf('?');
  const query = questionMark === -1 ? '' : url.slice(questionMark + 1);
  const params = new URLSearchParams(query);

  const explicit = params.get('dashboard');
  let dashboardId = embedMatch?.[1] ?? '';
  if (!dashboardId && explicit && UUID_RE.test(explicit)) {
    dashboardId = explicit;
  }

  const internal = dashboardId !== '';
  const targetId = internal ? dashboardId : fallbackDashboardId;

  const carried = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    const lower = key.toLowerCase();
    if (DROP_PARAMS.has(lower)) continue;
    // Only embed params survive the hop; explorer-ish params (compositeQuery etc.) would be noise.
    if (!isCarryableParam(key)) continue;
    carried.append(key, value);
  }

  return { dashboardId: targetId, params: carried, internal };
}

/** Params worth carrying into the target dashboard. */
function isCarryableParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith('var-')) return true;
  return (
    lower === 'relativetime' ||
    lower === 'starttime' ||
    lower === 'endtime' ||
    lower === 'theme' ||
    lower === 'mode' ||
    lower === 'locale' ||
    lower === 'refresh' ||
    lower === 'toolbar' ||
    lower === 'title' ||
    lower === 'drilldown' ||
    lower === 'focus'
  );
}

/**
 * Builds the in-place URL for a target dashboard.
 *
 * Time is passed through untouched: the embed parses epoch seconds (native SigNoz links use ms),
 * and `crossDashboardTime` is responsible for converting when the two conventions disagree.
 */
/**
 * Display params that must survive a dashboard hop. Without them the target loses the host's
 * chrome settings — most visibly `toolbar=false`, which would make the drill-down page sprout
 * the toolbar the host deliberately hid.
 */
const INHERITED_DISPLAY_PARAMS = [
  'toolbar',
  'title',
  'theme',
  'mode',
  'locale',
  'refresh',
  'annotations',
  'drilldown',
  'timeControl',
  'refreshControl',
  'modeControl',
  'fullscreenControl',
  'localeControl',
] as const;

export function buildDrilldownUrl(
  target: DrilldownTarget,
  current: {
    relativeTime: string | null;
    startTime: number | null;
    endTime: number | null;
    /** The current embed's own search params, inherited so chrome settings carry over. */
    inherit?: URLSearchParams | null;
  },
): string {
  const params = new URLSearchParams();

  // Chrome/display settings first so the target renders like the page we came from.
  for (const key of INHERITED_DISPLAY_PARAMS) {
    const value = current.inherit?.get(key);
    if (value !== null && value !== undefined && value !== '') params.set(key, value);
  }

  if (current.relativeTime !== null) {
    params.set('relativeTime', current.relativeTime);
  } else if (current.startTime !== null && current.endTime !== null) {
    params.set('startTime', String(current.startTime));
    params.set('endTime', String(current.endTime));
  }
  // Target-specific params win over everything inherited — a link that pins `toolbar=false`
  // must beat whatever the host page happened to pass in.
  for (const [key, value] of target.params.entries()) {
    params.set(key, value);
  }
  return `/embed/${target.dashboardId}?${params.toString()}`;
}

/**
 * Native SigNoz emits `{{timestamp_start}}` / `{{timestamp_end}}` in **milliseconds**
 * (`useDrilldownContextVariables` divides ns by 1e6), while the embed parses `startTime`
 * as **epoch seconds** (`parseEpoch`). Links authored for native SigNoz therefore arrive
 * 1000× too large; scale them back so a cross-system link still lands on the right window.
 */
export function normalizeTimestamp(value: string | null): string | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return value;
  // Anything past year 5000 in ms (~1.5e13) can only be an ms value meant as seconds.
  return n > 1.5e13 ? String(Math.floor(n / 1000)) : value;
}
