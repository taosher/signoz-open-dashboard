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

const EMBED_PATH_RE = /^\/embed\/([0-9a-f-]{36})(?:\/|$)/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Synthetic base used only to parse relative links with the `URL` constructor. `.invalid` is
 * reserved by RFC 2606 as never-resolvable, so it can never collide with a real host and is never
 * fetched — this value only ever exists in memory as an origin comparison target.
 */
const EMBED_BASE = 'http://embed.invalid';

/**
 * Display params that survive a dashboard hop. Without them the target loses the host's chrome
 * settings — most visibly `toolbar=false`, which would make the drill-down page sprout the toolbar
 * the host deliberately hid. One list, used for both "carry from the link" and "inherit from the page".
 */
const DISPLAY_PARAMS = [
  'toolbar',
  'title',
  'theme',
  'mode',
  'locale',
  'refresh',
  'annotations',
  'drilldown',
  'focus',
  'timeControl',
  'refreshControl',
  'modeControl',
  'fullscreenControl',
  'localeControl',
] as const;

const DISPLAY_PARAM_SET = new Set<string>(DISPLAY_PARAMS.map((key) => key.toLowerCase()));

/**
 * Rewrites a resolved context-link URL into an embed navigation target.
 *
 * A link is internal when it resolves onto the embed's own base — i.e. it is relative
 * (`/embed/<uuid>`, `?dashboard=<uuid>`) rather than absolute or protocol-relative. Everything
 * else returns `internal: false` so the caller can open it like native does.
 */
export function parseDrilldownTarget(
  url: string,
  fallbackDashboardId: string,
): DrilldownTarget {
  const parsed = new URL(url.trim(), EMBED_BASE);
  const onEmbedOrigin = parsed.origin === EMBED_BASE;
  const embedMatch = onEmbedOrigin ? EMBED_PATH_RE.exec(parsed.pathname) : null;
  const params = parsed.searchParams;

  const explicit = params.get('dashboard');
  let dashboardId = embedMatch?.[1] ?? '';
  if (!dashboardId && onEmbedOrigin && explicit && UUID_RE.test(explicit)) {
    dashboardId = explicit;
  }

  const internal = dashboardId !== '';
  const targetId = internal ? dashboardId : fallbackDashboardId;

  // Only embed params survive the hop; explorer-ish params (compositeQuery etc.) would be noise.
  const carried = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (isCarryableParam(key)) carried.append(key, value);
  }

  return { dashboardId: targetId, params: carried, internal };
}

/** Params worth carrying into the target dashboard. */
function isCarryableParam(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.startsWith('var-') ||
    lower === 'relativetime' ||
    lower === 'starttime' ||
    lower === 'endtime' ||
    DISPLAY_PARAM_SET.has(lower)
  );
}

/**
 * Builds the in-place URL for a target dashboard: the host's chrome settings and current time
 * window are inherited, then the link's own params and the click scope (`focus`) are applied last
 * so they win.
 *
 * Time is passed through untouched — the embed parses epoch seconds, and link authors targeting
 * native SigNoz are responsible for emitting the convention the embed reads.
 */
export function buildDrilldownUrl(
  target: DrilldownTarget,
  current: {
    relativeTime: string | null;
    startTime: number | null;
    endTime: number | null;
    /** The current embed's own search params, inherited so chrome settings carry over. */
    inherit?: URLSearchParams | null;
    /** Click scope ANDed onto every query of the target; omitted when the click carried no filters. */
    focus?: string;
  },
): string {
  const params = new URLSearchParams();

  // Chrome/display settings first so the target renders like the page we came from.
  for (const key of DISPLAY_PARAMS) {
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
  if (current.focus) params.set('focus', current.focus);

  return `/embed/${target.dashboardId}?${params.toString()}`;
}
