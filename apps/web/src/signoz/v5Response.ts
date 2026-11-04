/**
 * v5 response parsing (mirrors snapshot `convertV5Response` + `getLabelName`/`getLegend` semantics):
 * `time_series` (results→series→labels/values), `scalar` (columns+data),
 * `raw`, `distribution`.
 *
 * Legend rules (same as console):
 * - With template (e.g. `{{mountpoint}}`): substitute from series labels;
 * - Empty template + labels: single label takes the bare value, multiple labels join as `k="v"`;
 * - Empty template + no labels: take widget legend (legendMap), else queryName.
 * Note: the response aggregation's own `alias` is a backend-internal name (e.g. `__result_0`);
 * time-series legends must ignore it (widget-side alias is only used for scalar column names, see getColName).
 */
export interface UiSeries {
  queryName: string;
  legend: string;
  labels: Record<string, string>;
  points: { t: number; v: number }[];
}

export interface UiTable {
  queryName: string;
  columns: { id: string; name: string; isValue: boolean; queryName?: string }[];
  rows: Record<string, unknown>[];
}

/** Per-query metadata needed by drill-down click semantics (native `BuilderQuery` subset). */
export interface QueryMeta {
  name: string;
  signal?: string;
  groupBy?: string[];
  /** Step interval in seconds (from the response `meta.stepIntervals`, else the payload's bucket). */
  step?: number;
  metricName?: string;
}

/**
 * Time-series naming (mirrors observable behavior of `getLabelName` + `getLegend`).
 * Example: template `{{mountpoint}}` + labels `{mountpoint: /boot/efi}` → `/boot/efi`.
 */
export function formatSeriesLegend(
  queryName: string,
  legendMap: Record<string, string>,
  labels?: { key?: { name?: string }; value?: unknown }[],
): string {
  const template = legendMap[queryName] ?? '';
  const labelObj: Record<string, string> = {};
  for (const l of labels ?? []) {
    if (l?.key?.name) labelObj[l.key.name] = String(l.value ?? '');
  }
  if (template !== '') {
    const out = template.replace(/\{\{\s*(.*?)\s*\}\}/g, (_m, k: string) => labelObj[k] ?? '');
    if (out.trim() !== '') return out;
  }
  const keys = Object.keys(labelObj);
  if (keys.length === 1) return labelObj[keys[0]];
  if (keys.length > 1) return keys.map((k) => `${k}="${labelObj[k]}"`).join(',');
  if (template !== '') return template;
  return queryName;
}

function seriesLegend(
  queryName: string,
  legendMap: Record<string, string>,
  labels?: { key?: { name?: string }; value?: unknown }[],
): string {
  return formatSeriesLegend(queryName, legendMap, labels);
}

export function parseTimeSeries(
  results: Record<string, unknown>[],
  legendMap: Record<string, string>,
): UiSeries[] {
  const out: UiSeries[] = [];
  for (const r of results) {
    const queryName = String((r as Record<string, unknown>).queryName ?? '');
    const aggs = ((r as Record<string, unknown>).aggregations as Record<string, unknown>[] | undefined) ?? [];
    for (const agg of aggs) {
      const series = ((agg as Record<string, unknown>).series as Record<string, unknown>[] | undefined) ?? [];
      for (const s of series) {
        const labels = ((s as Record<string, unknown>).labels as { key: { name: string }; value: unknown }[] | undefined) ?? [];
        const labelObj: Record<string, string> = {};
        for (const l of labels) {
          if (l?.key?.name) labelObj[l.key.name] = String(l.value ?? '');
        }
        const values = ((s as Record<string, unknown>).values as { timestamp: number; value: string | number }[] | undefined) ?? [];
        out.push({
          queryName,
          legend: seriesLegend(queryName, legendMap, labels),
          labels: labelObj,
          points: values
            .map((p) => ({ t: Number(p.timestamp), v: Number(p.value) }))
            .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
            .sort((a, b) => a.t - b.t),
        });
      }
    }
  }
  return out;
}

function colDisplayName(
  col: { name: string; queryName: string; columnType: string; aggregationIndex?: number },
  legendMap: Record<string, string>,
  aggregations?: { alias?: string; expression?: string }[],
): string {
  if (col.columnType === 'group') return col.name;
  const agg = aggregations?.[col.aggregationIndex ?? 0];
  const count = aggregations?.length ?? 0;
  if (count > 1) return agg?.alias || agg?.expression || col.queryName;
  return agg?.alias || legendMap[col.queryName] || agg?.expression || col.name || col.queryName;
}

export function parseScalar(
  results: Record<string, unknown>[],
  legendMap: Record<string, string>,
  payloadQueries?: Record<string, unknown>[],
): UiTable[] {
  const aggPerQuery: Record<string, { alias?: string; expression?: string }[]> = {};
  for (const q of payloadQueries ?? []) {
    const spec = (q as Record<string, unknown>).spec as Record<string, unknown> | undefined;
    if ((q as Record<string, unknown>).type === 'builder_query' && spec && typeof spec.name === 'string') {
      aggPerQuery[spec.name] = ((spec.aggregations as { alias?: string; expression?: string }[] | undefined) ?? []).map((a) => ({
        alias: a.alias,
        expression: a.expression,
      }));
    }
  }
  return results.map((r) => {
    const rr = r as {
      queryName?: string;
      columns?: { name: string; queryName: string; columnType: string; aggregationIndex?: number }[];
      data?: unknown[][];
    };
    const queryName = rr.columns?.[0]?.queryName ?? String(rr.queryName ?? '');
    const columns = (rr.columns ?? []).map((c) => {
      const name = colDisplayName(c, legendMap, aggPerQuery[c.queryName]);
      return {
        id: `${c.queryName}.${c.aggregationIndex ?? 0}.${c.name}`,
        name,
        isValue: c.columnType === 'aggregation',
        queryName: c.queryName,
      };
    });
    const rows = (rr.data ?? []).map((row) => {
      const obj: Record<string, unknown> = {};
      (rr.columns ?? []).forEach((_c, i) => {
        const col = columns[i];
        if (col) obj[col.id] = row[i];
      });
      return obj;
    });
    return { queryName, columns, rows };
  });
}

function parseRaw(
  results: Record<string, unknown>[],
): UiTable[] {
  return results.flatMap((result) => {
    const queryName = String(result.queryName ?? '');
    const rawRows = Array.isArray(result.rows) ? result.rows : [];
    const rows = rawRows.flatMap((rawRow) => {
      const row = rawRow as Record<string, unknown>;
      const data = row.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
      return [data as Record<string, unknown>];
    });
    if (rows.length === 0) return [];

    const columnNames = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return [{
      queryName,
      columns: columnNames.map((name) => ({
        id: name,
        name,
        isValue: false,
      })),
      rows,
    }];
  });
}

export interface ParsedV5 {
  type: string;
  series: UiSeries[];
  tables: UiTable[];
  rawCount: number;
  /** Queries of the request (name/signal/groupBy/step/metric), for drill-down click semantics. */
  queries: QueryMeta[];
}

/** Step intervals (seconds) keyed by query name, as returned in `data.meta.stepIntervals`. */
function stepIntervalsOf(meta: Record<string, unknown> | undefined): Record<string, number> {
  const raw = meta?.stepIntervals;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[name] = n;
  }
  return out;
}

/** Builds the click-semantics metadata from the request payload plus the response's step intervals. */
export function queryMetaOf(
  payloadQueries: Record<string, unknown>[] | undefined,
  steps: Record<string, number>,
): QueryMeta[] {
  const out: QueryMeta[] = [];
  for (const envelope of payloadQueries ?? []) {
    const spec = (envelope as Record<string, unknown>).spec as Record<string, unknown> | undefined;
    const name = typeof spec?.name === 'string' ? spec.name : '';
    if (name === '') continue;
    const groupBy = Array.isArray(spec?.groupBy)
      ? (spec?.groupBy as Record<string, unknown>[])
          .map((g) => (typeof g?.name === 'string' ? g.name : ''))
          .filter((n) => n !== '')
      : undefined;
    const aggregations = Array.isArray(spec?.aggregations) ? (spec?.aggregations as Record<string, unknown>[]) : [];
    const metricName = typeof aggregations[0]?.metricName === 'string' ? aggregations[0].metricName : undefined;
    const payloadStep = Number(spec?.stepInterval);
    out.push({
      name,
      signal: typeof spec?.signal === 'string' ? spec.signal : undefined,
      groupBy: groupBy && groupBy.length > 0 ? groupBy : undefined,
      step: steps[name] ?? (Number.isFinite(payloadStep) && payloadStep > 0 ? payloadStep : undefined),
      metricName,
    });
  }
  return out;
}

export function parseV5Response(
  json: unknown,
  legendMap: Record<string, string>,
  payloadQueries?: Record<string, unknown>[],
): ParsedV5 {
  const root = (json ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const inner = (data.data ?? data) as Record<string, unknown>;
  const type = String(inner.type ?? data.type ?? '');
  const results = ((inner.results as Record<string, unknown>[] | undefined) ?? (data.results as Record<string, unknown>[] | undefined) ?? []);
  const queries = queryMetaOf(
    payloadQueries,
    stepIntervalsOf((data.meta ?? inner.meta) as Record<string, unknown> | undefined),
  );
  if (type === 'time_series') return { type, series: parseTimeSeries(results, legendMap), tables: [], rawCount: 0, queries };
  if (type === 'scalar') {
    // scalar has two shapes: columnar (columns+data, table-like) and series-like
    // (aggregations+series, pie/value-like, native takes the convertTimeSeriesData branch)
    const columnar = results.filter(
      (r) => Array.isArray((r as Record<string, unknown>).columns),
    );
    const seriesLike = results.filter(
      (r) => !Array.isArray((r as Record<string, unknown>).columns),
    );
    return {
      type,
      series: parseTimeSeries(seriesLike, legendMap),
      tables: parseScalar(columnar, legendMap, payloadQueries),
      rawCount: 0,
      queries,
    };
  }
  if (type === 'raw') {
    const tables = parseRaw(results);
    return { type, series: [], tables, rawCount: results.length, queries };
  }
  if (type === 'trace') return { type, series: [], tables: [], rawCount: results.length, queries };
  return { type, series: [], tables: [], rawCount: results.length, queries };
}
