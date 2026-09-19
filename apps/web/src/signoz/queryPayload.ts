/**
 * v5 payload 装配（对照快照 `prepareQueryRangePayloadV5`，逻辑一致即可）。
 * 输入为看板 widget 原样 query（builder/formula/promql/CH 信封），
 * `start/end` 为毫秒；table 置 `formatTableResultForUI=true`。
 */
import { mapPanelTypeToRequestType } from './panels';
import type { BuilderQueryItem, EmbedWidget } from '../core/dashboard';

export interface V5Payload {
  schemaVersion: 'v1';
  start: number;
  end: number;
  requestType: string;
  compositeQuery: { queries: Record<string, unknown>[] };
  formatOptions: { formatTableResultForUI: boolean; fillGaps: boolean };
  variables: Record<string, { value: unknown; type?: string }>;
}

interface BuildOpts {
  startMs: number;
  endMs: number;
  variables?: Record<string, unknown>;
}

function signalOf(dataSource: string | undefined): 'traces' | 'logs' | 'metrics' {
  if (dataSource === 'traces') return 'traces';
  if (dataSource === 'logs') return 'logs';
  return 'metrics';
}

function mapGroupBy(items: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  return (items as Record<string, unknown>[]).map((item) => {
    const out: Record<string, unknown> = {
      name: item.key ?? item.name,
      fieldDataType: item.dataType ?? item.fieldDataType ?? '',
      fieldContext: item.type ?? item.fieldContext ?? '',
    };
    for (const k of ['description', 'unit', 'signal', 'materialized']) {
      if (item[k] !== undefined) out[k] = item[k];
    }
    return out;
  });
}

function clean<T>(v: T | undefined | null | ''): T | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  return v;
}

function mapSelectFields(cols: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(cols)) return undefined;
  const nonEmpty = (cols as Record<string, unknown>[]).filter((c) => c.key ?? c.name);
  if (nonEmpty.length === 0) return undefined;
  return nonEmpty.map((c) => {
    const out: Record<string, unknown> = {
      name: c.name ?? c.key,
      fieldDataType: c.fieldDataType ?? c.dataType ?? '',
      fieldContext: c.fieldContext ?? c.type ?? '',
    };
    if (c.signal !== undefined) out.signal = c.signal;
    return out;
  });
}

function toBuilderEnvelopes(items: BuilderQueryItem[], requestType: string, panelType: string): Record<string, unknown>[] {
  return items.map((q) => {
    const signal = signalOf(typeof q.dataSource === 'string' ? q.dataSource : undefined);
    const spec: Record<string, unknown> = {
      name: q.queryName,
      signal,
      stepInterval: (q.stepInterval as string | number | null | undefined) || null,
      disabled: q.disabled,
      filter: q.filter ?? { expression: '' },
      legend: clean(q.legend as string | undefined),
      having: (q.having as { expression?: string } | undefined)?.expression
        ? q.having
        : undefined,
      functions: Array.isArray(q.functions) && q.functions.length > 0 ? q.functions : undefined,
      order: Array.isArray(q.orderBy) && q.orderBy.length > 0
        ? (q.orderBy as { columnName: string; order: string }[]).map((o) => ({
            key: { name: o.columnName },
            direction: o.order,
          }))
        : undefined,
      limit:
        panelType === 'table' || panelType === 'list'
          ? ((q.limit as number | null | undefined) ?? (q as Record<string, unknown>).pageSize ?? undefined)
          : ((q.limit as number | null | undefined) ?? undefined),
      offset: requestType === 'raw' || requestType === 'trace' ? (q as Record<string, unknown>).offset : undefined,
    };
    if (q.groupBy !== undefined) spec.groupBy = mapGroupBy(q.groupBy);
    if ((q as Record<string, unknown>).selectColumns !== undefined) {
      spec.selectFields = mapSelectFields((q as Record<string, unknown>).selectColumns);
    }
    if (signal === 'metrics') {
      const agg = (q.aggregations as Record<string, unknown>[] | undefined)?.[0] ?? {};
      spec.source = (q.source as string | undefined) ?? '';
      spec.aggregations = [
        {
          metricName: agg.metricName ?? (q as Record<string, unknown>).aggregateAttribute,
          temporality: agg.temporality ?? '',
          timeAggregation: agg.timeAggregation ?? (q as Record<string, unknown>).timeAggregation,
          spaceAggregation: agg.spaceAggregation ?? (q as Record<string, unknown>).spaceAggregation,
          ...(panelType === 'table' || panelType === 'pie' || panelType === 'value'
            ? { reduceTo: agg.reduceTo ?? (q as Record<string, unknown>).reduceTo }
            : {}),
        },
      ];
    } else if (requestType === 'raw') {
      // raw 不带聚合（与原生一致）
    } else {
      const aggs = (q.aggregations as { expression?: string; alias?: string }[] | undefined) ?? [];
      spec.aggregations =
        aggs.length > 0 ? aggs.map((a) => ({ expression: a.expression ?? 'count()', alias: a.alias })) : [{ expression: 'count()' }];
    }
    // 清理 undefined（保持信封干净）
    for (const k of Object.keys(spec)) {
      if (spec[k] === undefined) delete spec[k];
    }
    return { type: 'builder_query', spec };
  });
}

export function buildQueryRangePayload(
  widget: EmbedWidget,
  opts: BuildOpts,
): { payload: V5Payload | null; legendMap: Record<string, string> } {
  const panelType = String(widget.panelTypes ?? '');
  const requestType = mapPanelTypeToRequestType(panelType);
  const legendMap: Record<string, string> = {};
  const query = widget.query ?? {};
  const envelopes: Record<string, unknown>[] = [];

  if (query.queryType === 'builder' || (!query.queryType && query.builder)) {
    const b = query.builder ?? {};
    const items = ((b.queryData as BuilderQueryItem[] | undefined) ?? []).filter(
      (q) => q && typeof q.queryName === 'string',
    );
    for (const q of items) {
      if (typeof q.legend === 'string' && q.legend !== '') legendMap[q.queryName] = q.legend;
    }
    envelopes.push(...toBuilderEnvelopes(items, requestType, panelType));
    const formulas = ((b.queryFormulas as { queryName: string; expression?: string; legend?: string; disabled?: boolean }[] | undefined) ?? []).filter(
      (f) => f && typeof f.queryName === 'string' && typeof f.expression === 'string' && f.expression.trim() !== '',
    );
    for (const f of formulas) {
      if (f.legend) legendMap[f.queryName] = f.legend;
      envelopes.push({
        type: 'builder_formula',
        spec: {
          name: f.queryName,
          expression: f.expression,
          disabled: f.disabled,
          legend: clean(f.legend),
        },
      });
    }
    const ops = ((b.queryTraceOperator as { queryName: string; expression?: string; legend?: string }[] | undefined) ?? []).filter(
      (o) => o && typeof o.expression === 'string' && o.expression.trim() !== '',
    );
    for (const o of ops) {
      if (o.legend) legendMap[o.queryName] = o.legend;
      envelopes.push({ type: 'builder_trace_operator', spec: { name: o.queryName, expression: o.expression } });
    }
  // 注意：看板 JSON 里每个 widget 恒带 `promql: [{query: ''}]` /
  // `clickhouse_sql: [{query: ''}]` 占位数组，只能按 queryType 分发，
  // 不能按数组存在性判断（否则 clickhouse_sql 会被空 promql 占位吞掉）。
  } else if (query.queryType === 'promql') {
    const list = (query.promql as { query: string; legend?: string; name?: string; disabled?: boolean }[] | undefined) ?? [];
    list.forEach((item, idx) => {
      if (!item?.query) return;
      const name = item.name ?? `A${idx}`;
      if (item.legend) legendMap[name] = item.legend;
      envelopes.push({
        type: 'promql',
        spec: { name, query: item.query, disabled: item.disabled ?? false, legend: clean(item.legend), stats: false },
      });
    });
  } else if (query.queryType === 'clickhouse_sql') {
    const list = (query.clickhouse_sql as { query: string; legend?: string; name?: string; disabled?: boolean }[] | undefined) ?? [];
    list.forEach((item, idx) => {
      if (!item?.query) return;
      const name = item.name ?? `A${idx}`;
      if (item.legend) legendMap[name] = item.legend;
      envelopes.push({
        type: 'clickhouse_sql',
        spec: { name, query: item.query, disabled: item.disabled ?? false, legend: clean(item.legend) },
      });
    });
  }

  if (envelopes.length === 0 || requestType === '') return { payload: null, legendMap };

  const variables: V5Payload['variables'] = {};
  for (const [k, v] of Object.entries(opts.variables ?? {})) {
    variables[k] = { value: v };
  }
  return {
    legendMap,
    payload: {
      schemaVersion: 'v1',
      start: Math.floor(opts.startMs),
      end: Math.floor(opts.endMs),
      requestType,
      compositeQuery: { queries: envelopes },
      formatOptions: {
        formatTableResultForUI: panelType === 'table',
        fillGaps: false,
      },
      variables,
    },
  };
}
