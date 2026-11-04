/**
 * Dashboard types (custom contract for our own UI, only the subset needed for rendering; unknown fields pass through unvalidated).
 * Reference: SigNoz 0.97.0 `frontend/src/types/api/dashboard/getAll.ts`.
 */
export type PanelTypeName =
  | 'graph'
  | 'table'
  | 'list'
  | 'pie'
  | 'bar'
  | 'histogram'
  | 'value'
  | 'trace'
  | 'row';

export interface DashboardVariable {
  name?: string;
  description?: string;
  type?: string;
  order?: number | string;
  selectedValue?: string | number | boolean | (string | number | boolean)[] | null;
  customValue?: string;
  textboxValue?: string;
  defaultValue?: string;
  dynamicVariablesAttribute?: string;
  dynamicVariablesSource?: string;
  queryValue?: string;
  multiSelect?: boolean;
  showALLOption?: boolean;
}

export interface BuilderQueryItem {
  queryName: string;
  dataSource?: string;
  disabled?: boolean;
  expression?: string;
  legend?: string;
  // Remaining aggregation/filter/groupBy etc. pass through untouched to signoz/queryPayload
  [k: string]: unknown;
}

export interface WidgetQuery {
  queryType?: string;
  builder?: {
    queryData?: BuilderQueryItem[];
    queryFormulas?: unknown[];
    queryTraceOperator?: unknown[];
  };
  promql?: { query: string; legend?: string; name?: string; disabled?: boolean }[];
  clickhouse_sql?: { query: string; legend?: string; name?: string; disabled?: boolean }[];
  [k: string]: unknown;
}

export interface EmbedWidget {
  id: string;
  panelTypes: PanelTypeName | string;
  title?: unknown;
  description?: string;
  text?: string;
  query?: WidgetQuery;
  timePreferance?: string;
  yAxisUnit?: string;
  [k: string]: unknown;
}

export interface DashboardData {
  title: string;
  description?: string;
  widgets?: EmbedWidget[];
  variables?: Record<string, DashboardVariable>;
  version?: string;
  layout?: { i: string; w: number; h: number; x: number; y: number }[];
}

export interface DashboardPayload {
  id: string;
  data: DashboardData;
}

function panelType(kind: string): PanelTypeName | string {
  switch (kind) {
    case 'signoz/TimeSeriesPanel':
      return 'graph';
    case 'signoz/NumberPanel':
      return 'value';
    case 'signoz/TablePanel':
      return 'table';
    case 'signoz/ListPanel':
      return 'list';
    case 'signoz/HistogramPanel':
      return 'histogram';
    case 'signoz/PieChartPanel':
      return 'pie';
    case 'signoz/BarChartPanel':
      return 'bar';
    case 'signoz/TextPanel':
      return 'text';
    case 'signoz/AreaChartPanel':
      return 'graph';
    default:
      return kind;
  }
}

function v2Variables(raw: unknown): Record<string, DashboardVariable> {
  if (!Array.isArray(raw)) return {};
  const out: Record<string, DashboardVariable> = {};
  for (const item of raw) {
    const entry = item as Record<string, unknown>;
    const spec = (entry.spec ?? {}) as Record<string, unknown>;
    const plugin = (spec.plugin ?? {}) as Record<string, unknown>;
    const pluginSpec = (plugin.spec ?? {}) as Record<string, unknown>;
    const name = typeof spec.name === 'string' ? spec.name : typeof pluginSpec.name === 'string' ? pluginSpec.name : '';
    if (!name) continue;
    const display = (spec.display ?? {}) as Record<string, unknown>;
    const variable: DashboardVariable = {
      name,
      type: plugin.kind === 'signoz/DynamicVariable' ? 'DYNAMIC' : 'CUSTOM',
      order: Object.keys(out).length,
      description: typeof display.description === 'string' ? display.description : undefined,
      multiSelect: spec.allowMultiple === true,
      showALLOption: spec.allowAllValue === true,
      defaultValue: typeof spec.defaultValue === 'string' ? spec.defaultValue : undefined,
      customValue:
        typeof pluginSpec.customValue === 'string'
          ? pluginSpec.customValue
          : typeof spec.customAllValue === 'string'
            ? spec.customAllValue
            : undefined,
      dynamicVariablesAttribute: typeof pluginSpec.name === 'string' ? pluginSpec.name : undefined,
      dynamicVariablesSource: typeof pluginSpec.signal === 'string' ? pluginSpec.signal : undefined,
      queryValue: typeof pluginSpec.queryValue === 'string' ? pluginSpec.queryValue : undefined,
    };
    out[name] = variable;
  }
  return out;
}

function v2Query(panel: Record<string, unknown>): WidgetQuery | undefined {
  const queries = Array.isArray(panel.queries) ? panel.queries : [];
  const querySpec = (queries[0] as Record<string, unknown> | undefined)?.spec as Record<string, unknown> | undefined;
  const plugin = (querySpec?.plugin ?? {}) as Record<string, unknown>;
  const pluginKind = typeof plugin.kind === 'string' ? plugin.kind : '';
  const pluginSpec = (plugin.spec ?? {}) as Record<string, unknown>;

  // SigNoz v6 stores ordinary panels as a direct BuilderQuery. The older
  // dashboard shape wrapped these in a CompositeQuery, so support both forms.
  if (pluginKind === 'signoz/BuilderQuery') {
    const signal = typeof pluginSpec.signal === 'string' ? pluginSpec.signal : 'metrics';
    const builder: BuilderQueryItem = {
      queryName: typeof pluginSpec.name === 'string' ? pluginSpec.name : 'A',
      dataSource: signal,
      legend: typeof pluginSpec.legend === 'string' ? pluginSpec.legend : undefined,
      filter: pluginSpec.filter,
      groupBy: pluginSpec.groupBy,
      aggregations: pluginSpec.aggregations,
      selectColumns: pluginSpec.selectFields,
      orderBy: Array.isArray(pluginSpec.order)
        ? pluginSpec.order.map((item) => {
            const order = item as Record<string, unknown>;
            const key = (order.key ?? {}) as Record<string, unknown>;
            return {
              columnName: key.name ?? order.name,
              order: order.direction ?? order.order,
            };
          })
        : undefined,
      limit: pluginSpec.limit,
      functions: pluginSpec.functions,
      having: pluginSpec.having,
      source: pluginSpec.source,
      timeAggregation: pluginSpec.timeAggregation,
      spaceAggregation: pluginSpec.spaceAggregation,
      reduceTo: pluginSpec.reduceTo,
    };
    return { queryType: 'builder', builder: { queryData: [builder], queryFormulas: [], queryTraceOperator: [] } };
  }

  const compositeSpec = pluginSpec;
  const items = Array.isArray(compositeSpec.queries) ? compositeSpec.queries : [];
  const promql: NonNullable<WidgetQuery['promql']> = [];
  const clickhouse: NonNullable<WidgetQuery['clickhouse_sql']> = [];
  for (const item of items) {
    const q = item as Record<string, unknown>;
    const spec = (q.spec ?? {}) as Record<string, unknown>;
    const name = typeof spec.name === 'string' ? spec.name : undefined;
    const query = typeof spec.query === 'string' ? spec.query : '';
    if (!query) continue;
    const target = q.type === 'clickhouse_sql' ? clickhouse : promql;
    target.push({
      name,
      query,
      legend: typeof spec.legend === 'string' ? spec.legend : undefined,
      disabled: spec.disabled === true,
    });
  }
  if (promql.length > 0) return { queryType: 'promql', promql };
  if (clickhouse.length > 0) return { queryType: 'clickhouse_sql', clickhouse_sql: clickhouse };
  return undefined;
}

function v2Dashboard(data: Record<string, unknown>): DashboardData | null {
  const spec = data.spec as Record<string, unknown> | undefined;
  if (!spec || typeof spec !== 'object' || !spec.panels || typeof spec.panels !== 'object') return null;
  const panels = spec.panels as Record<string, unknown>;
  const widgets: EmbedWidget[] = Object.entries(panels).map(([id, raw]) => {
    const panel = raw as Record<string, unknown>;
    const panelSpec = (panel.spec ?? {}) as Record<string, unknown>;
    const display = (panelSpec.display ?? {}) as Record<string, unknown>;
    const plugin = (panelSpec.plugin ?? {}) as Record<string, unknown>;
    const pluginSpec = (plugin.spec ?? {}) as Record<string, unknown>;
    const formatting = (pluginSpec.formatting ?? {}) as Record<string, unknown>;
    return {
      id,
      panelTypes: panelType(typeof plugin.kind === 'string' ? plugin.kind : ''),
      title: typeof display.name === 'string' ? display.name : id,
      description: typeof display.description === 'string' ? display.description : undefined,
      query: v2Query(panelSpec),
      text: typeof pluginSpec.text === 'string' ? pluginSpec.text : undefined,
      yAxisUnit: typeof formatting.unit === 'string' ? formatting.unit : undefined,
    };
  });
  const layout: DashboardData['layout'] = [];
  const layouts = Array.isArray(spec.layouts) ? spec.layouts : [];
  let sectionY = 0;
  for (const section of layouts) {
    const sectionSpec = (section as Record<string, unknown>).spec as Record<string, unknown> | undefined;
    const items = Array.isArray(sectionSpec?.items) ? sectionSpec.items : [];
    let maxHeight = 1;
    for (const raw of items) {
      const item = raw as Record<string, unknown>;
      const content = (item.content ?? {}) as Record<string, unknown>;
      const ref = typeof content.$ref === 'string' ? content.$ref.split('/').pop() : '';
      if (!ref || !panels[ref]) continue;
      const width = Number(item.width ?? 12);
      const height = Number(item.height ?? 6);
      const x = Number(item.x ?? 0);
      const y = Number(item.y ?? 0);
      layout.push({ i: ref, w: width, h: height, x, y: sectionY + y });
      maxHeight = Math.max(maxHeight, y + height);
    }
    sectionY += maxHeight + 1;
  }
  const display = (spec.display ?? {}) as Record<string, unknown>;
  return {
    title: typeof display.name === 'string' ? display.name : typeof data.name === 'string' ? data.name : 'Dashboard',
    description: typeof display.description === 'string' ? display.description : undefined,
    widgets,
    variables: v2Variables(spec.variables),
    layout,
    version: typeof data.schemaVersion === 'string' ? data.schemaVersion : undefined,
  };
}

/** Supports legacy v1 envelopes and SigNoz v2 `{data:{spec:{panels,...}}}` dashboards. */
export function unwrapDashboard(json: unknown): DashboardPayload | null {
  const root = (json ?? {}) as Record<string, unknown>;
  const d1 = root.data as Record<string, unknown> | undefined;
  if (!d1) return null;
  const v2 = v2Dashboard(d1);
  if (v2 && typeof d1.id === 'string') return { id: d1.id, data: v2 };
  if (d1.data && typeof d1.data === 'object') {
    const inner = d1.data as Record<string, unknown>;
    if (typeof d1.id === 'string') return { id: d1.id, data: inner as unknown as DashboardData };
  }
  if (Array.isArray(d1.widgets) || typeof d1.title === 'string') {
    return { id: typeof d1.id === 'string' ? d1.id : '', data: d1 as unknown as DashboardData };
  }
  return null;
}

export function widgetTitle(w: EmbedWidget): string {
  if (typeof w.title === 'string') return w.title;
  // SigNoz title may be a ReactNode; our UI only takes strings and falls back to id otherwise
  return w.id;
}
