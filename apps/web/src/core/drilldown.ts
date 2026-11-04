/**
 * Drill-down payloads — a faithful port of SigNoz's click semantics
 * (`pages/DashboardPage/DashboardContainer/Panels/utils/drilldown/*`).
 *
 * Each renderer turns its native click into one `DrilldownClickPayload`; what happens next
 * (context menu, filter, navigate) is a consumer decision, deliberately not made here.
 * Pure functions only, so the click semantics are unit-testable without a DOM.
 */

export type DrilldownSignal = 'metrics' | 'logs' | 'traces';

export interface FilterData {
  filterKey: string;
  filterValue: string | number;
  /** Always `=` (native `getFiltersFromMetric`). */
  operator: '=';
}

export interface DrilldownContext {
  /** The clicked series'/column's query; formulas are not drillable. */
  queryName: string;
  signal: DrilldownSignal;
  /** Equality filters from the clicked point's group-by labels (empty when ungrouped). */
  filters: FilterData[];
  /** Explorer window, epoch **seconds**: clicked bucket ± step (charts) or the fetched window (scalar/table/pie). */
  timeRange?: { startTime: number; endTime: number };
  /** Series/slice display name (menu header line 2). */
  label?: string;
  seriesColor?: string;
  /** Tables only: whether a value or group column was clicked. */
  columnKind?: 'aggregate' | 'group';
  /** Group-column click only. */
  clickedKey?: string;
  clickedValue?: string | number;
}

/** What a renderer's click emits: popover anchor + drilldown context. */
export interface DrilldownClickPayload {
  coordinates: { x: number; y: number };
  context: DrilldownContext;
  /** Panel that was clicked (filled in by the core relay, not by the renderer). */
  panelId?: string;
  /** The panel's `spec.links` resolved with variables, time window and clicked filters. */
  links?: ResolvedLink[];
}

/**
 * Turns a click payload into a scope expression the target dashboard ANDs onto every query.
 *
 * Needed because SigNoz substitutes variables at value level only: `field = $value` works, but
 * `$field = $value` and `$wholeExpression` do not, so a single generic detail dashboard cannot
 * express "whatever the user clicked" through variables alone.
 */
export function focusExpression(filters: FilterData[]): string {
  return filters.map((filter) => `${filter.filterKey} = ${quoteIdent(filter.filterValue)}`).join(' AND ');
}

/** Fallback step (seconds) when the response carries no per-query step interval. */
export const DEFAULT_STEP_INTERVAL = 60;

/**
 * Native `isValidQueryName`: empty names and formula results (by the `F` prefix convention)
 * are not drillable.
 */
export function isValidQueryName(queryName: string): boolean {
  if (!queryName || queryName.trim() === '') return false;
  return !queryName.startsWith('F');
}

/** Native `resolveDrilldownSignal`: unknown signals fall back to metrics. */
export function resolveDrilldownSignal(signal: string | undefined): DrilldownSignal {
  if (signal === 'logs') return 'logs';
  if (signal === 'traces') return 'traces';
  return 'metrics';
}

/** Native `getFiltersFromMetric`: every label becomes an `=` filter. */
export function filtersFromLabels(labels: Record<string, string>): FilterData[] {
  return Object.keys(labels).map((key) => ({
    filterKey: key,
    filterValue: labels[key],
    operator: '=',
  }));
}

/**
 * Native `getGroupByFilters`: keep only labels that are actual group-by dimensions, so an
 * ungrouped series (whose legend backfills `{queryName: queryName}`) yields no filters.
 */
export function groupByFilters(labels: Record<string, string>, groupBy: string[] | undefined): FilterData[] {
  const keys = new Set(groupBy ?? []);
  if (keys.size === 0) return [];
  return filtersFromLabels(labels).filter((filter) => keys.has(filter.filterKey));
}

/** Native `isApmMetric`: `signoz_*` metrics widen the clicked window one step left. */
export function isApmMetric(metricName = ''): boolean {
  return metricName.startsWith('signoz_');
}

/** Native `getTimeRangeFromStepInterval`; `xValue` is the clicked bucket in epoch seconds. */
export function stepClickTimeRange(
  stepInterval: number,
  xValue: number,
  isApm: boolean,
): { startTime: number; endTime: number } {
  return {
    startTime: isApm ? xValue - stepInterval : xValue,
    endTime: xValue + stepInterval,
  };
}

/** Native `stepClickTimeRange`: resolves the clicked query's step/APM-ness, then widens the bucket. */
export function chartClickTimeRange(params: {
  clickedTimestamp: number;
  queryName: string;
  queries: QueryMeta[];
}): { startTime: number; endTime: number } {
  const query = params.queries.find((q) => q.name === params.queryName);
  const step = query?.step ?? DEFAULT_STEP_INTERVAL;
  const apm = query?.signal === 'metrics' && isApmMetric(query.metricName ?? '');
  return stepClickTimeRange(step, params.clickedTimestamp, apm);
}

/** Per-query metadata the click resolvers need; owned by the response parser that produces it. */
import type { QueryMeta } from '../signoz/v5Response';
import { quoteIdent } from './variables';
export type { QueryMeta };

export interface ClickPoint {
  x: number;
  y: number;
}

/** Native `enrichChartClick` (TimeSeries / Bar / Area): clicked series + its bucket. */
export function chartClickContext(params: {
  point: ClickPoint;
  queryName: string;
  labels: Record<string, string>;
  legend: string;
  color?: string;
  /** Clicked bucket timestamp, epoch seconds. */
  timestamp: number;
  queries: QueryMeta[];
}): DrilldownClickPayload | null {
  if (!isValidQueryName(params.queryName)) return null;
  const query = params.queries.find((q) => q.name === params.queryName);
  return {
    coordinates: params.point,
    context: {
      queryName: params.queryName,
      signal: resolveDrilldownSignal(query?.signal),
      filters: groupByFilters(params.labels, query?.groupBy),
      timeRange: chartClickTimeRange({
        clickedTimestamp: params.timestamp,
        queryName: params.queryName,
        queries: params.queries,
      }),
      label: params.legend,
      seriesColor: params.color,
    },
  };
}

/** Native `enrichPieClick`: slice's group-by labels; panel window. */
export function pieClickContext(params: {
  point: ClickPoint;
  queryName: string;
  labels: Record<string, string>;
  label: string;
  color?: string;
  timeRange: { startTime: number; endTime: number };
  queries: QueryMeta[];
}): DrilldownClickPayload | null {
  if (!isValidQueryName(params.queryName)) return null;
  const query = params.queries.find((q) => q.name === params.queryName);
  return {
    coordinates: params.point,
    context: {
      queryName: params.queryName,
      signal: resolveDrilldownSignal(query?.signal),
      filters: groupByFilters(params.labels, query?.groupBy),
      timeRange: params.timeRange,
      label: params.label,
      seriesColor: params.color,
    },
  };
}

/** Native `enrichNumberClick`: no filters (the whole card is the value); panel window. */
export function numberClickContext(params: {
  point: ClickPoint;
  queryName: string;
  timeRange: { startTime: number; endTime: number };
  queries: QueryMeta[];
}): DrilldownClickPayload | null {
  if (!isValidQueryName(params.queryName)) return null;
  const query = params.queries.find((q) => q.name === params.queryName);
  return {
    coordinates: params.point,
    context: {
      queryName: params.queryName,
      signal: resolveDrilldownSignal(query?.signal),
      filters: [],
      timeRange: params.timeRange,
    },
  };
}

/**
 * Native `enrichTableClick`: the row's group cells become equality filters; a value-column
 * click opens the aggregate view, a group-column click filters by that single cell.
 */
export function tableClickContext(params: {
  point: ClickPoint;
  record: Record<string, unknown>;
  columnId: string;
  columns: { id: string; name: string; isValue: boolean; queryName?: string }[];
  timeRange: { startTime: number; endTime: number };
  queries: QueryMeta[];
}): DrilldownClickPayload | null {
  const clickedColumn = params.columns.find((col) => col.id === params.columnId);
  const valueColumn = clickedColumn?.isValue
    ? clickedColumn
    : params.columns.find((col) => col.isValue);
  const queryName = valueColumn?.queryName ?? '';
  if (!valueColumn || !isValidQueryName(queryName)) return null;

  const filters: FilterData[] = [];
  for (const col of params.columns) {
    if (col.isValue) continue;
    const value = params.record[col.id];
    if (value !== null && value !== undefined) {
      filters.push({ filterKey: col.name, filterValue: value as string | number, operator: '=' });
    }
  }

  const query = params.queries.find((q) => q.name === queryName);
  const isGroupColumn = clickedColumn != null && !clickedColumn.isValue;
  return {
    coordinates: params.point,
    context: {
      queryName,
      signal: resolveDrilldownSignal(query?.signal),
      filters,
      timeRange: params.timeRange,
      columnKind: isGroupColumn ? 'group' : 'aggregate',
      clickedKey: isGroupColumn ? clickedColumn.name : undefined,
      clickedValue: isGroupColumn ? (params.record[clickedColumn.id] as string | number) : undefined,
    },
  };
}

/**
 * Panel-level `spec.links` resolution (native `resolvePanelContextLinks`): `{{var}}` from
 * dashboard variables, `{{timestamp_start}}`/`{{timestamp_end}}` in ms, `{{_field}}` from the
 * clicked point. Kept here so the click payload can be turned into a link by a consumer.
 */
export interface PanelLink {
  name?: string;
  url?: string;
  tooltip?: string;
  targetBlank?: boolean;
  renderVariables?: boolean;
}

export interface ResolvedLink {
  id: string;
  label: string;
  url: string;
  tooltip?: string;
  targetBlank: boolean;
}

const TEMPLATE_RE = /\{\{\s*\.?([A-Za-z0-9_.:-]+)\s*\}\}/g;

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringify).join(', ');
  return String(value);
}

export function buildTemplateContext(params: {
  variables: Record<string, unknown>;
  startMs: number;
  endMs: number;
  filters?: FilterData[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(params.variables ?? {})) {
    if (value === null || value === undefined) continue;
    out[name] = stringify(value);
  }
  out.timestamp_start = String(Math.floor(params.startMs));
  out.timestamp_end = String(Math.floor(params.endMs));
  for (const filter of params.filters ?? []) {
    out[`_${filter.filterKey}`] = stringify(filter.filterValue);
  }
  return out;
}

export function resolveTemplate(text: string, context: Record<string, string>): string {
  return text.replace(TEMPLATE_RE, (_match, name: string) =>
    Object.prototype.hasOwnProperty.call(context, name) ? context[name] : _match,
  );
}

/** Only http(s) and root-relative paths are allowed (blocks `javascript:` and friends). */
export function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** A literal `%` (e.g. `?name=95%`) isn't valid percent-encoding — fall back to the raw string. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Resolves a link URL the way native `resolveContextLinkUrl` does: the path is substituted
 * directly, but every query parameter is decoded (twice — values may be double-encoded), then
 * substituted, then re-encoded. Without that, a `{{var}}` inside an encoded `compositeQuery`
 * stays buried as `%7B%7Bvar%7D%7D` and never resolves.
 */
export function resolveLinkUrl(url: string, context: Record<string, string>): string {
  const questionMark = url.indexOf('?');
  if (questionMark === -1) return resolveTemplate(url, context);

  const base = resolveTemplate(url.slice(0, questionMark), context);
  const params = new URLSearchParams(url.slice(questionMark + 1));
  const resolved = Array.from(params.entries())
    .map(([key, value]) => {
      const decoded = safeDecode(safeDecode(value));
      return `${encodeURIComponent(key)}=${encodeURIComponent(resolveTemplate(decoded, context))}`;
    })
    .join('&');
  return `${base}?${resolved}`;
}

export function resolvePanelLinks(
  links: PanelLink[] | undefined,
  context: Record<string, string>,
): ResolvedLink[] {
  const usable = (links ?? []).filter((link) => typeof link.url === 'string' && link.url !== '');
  return usable
    .map((link, index) => {
      const rawUrl = String(link.url);
      const rawLabel = link.name && link.name !== '' ? link.name : rawUrl;
      const render = link.renderVariables !== false;
      const url = render ? resolveLinkUrl(rawUrl, context) : rawUrl;
      return {
        id: String(index),
        label: render ? resolveTemplate(rawLabel, context) : rawLabel,
        url,
        tooltip: link.tooltip,
        targetBlank: link.targetBlank ?? true,
      };
    })
    .filter((link) => isSafeLinkUrl(link.url));
}
