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

/** Upstream `GET /api/v1/dashboards/:id` envelope has two shapes: `{data:{...}}` and `{data:{data:{...}}}`. */
export function unwrapDashboard(json: unknown): DashboardPayload | null {
  const root = (json ?? {}) as Record<string, unknown>;
  const d1 = root.data as Record<string, unknown> | undefined;
  if (!d1) return null;
  // Shape A: { data: { id, data: {...} } }
  if (d1.data && typeof d1.data === 'object') {
    const inner = d1.data as Record<string, unknown>;
    if (typeof d1.id === 'string') {
      return { id: d1.id, data: inner as unknown as DashboardData };
    }
  }
  // Shape B: { data: { title, widgets } } (when there is no id wrapper, the caller backfills the request id)
  if (Array.isArray((d1 as Record<string, unknown>).widgets) || typeof (d1 as Record<string, unknown>).title === 'string') {
    return { id: typeof d1.id === 'string' ? (d1.id as string) : '', data: d1 as unknown as DashboardData };
  }
  return null;
}

export function widgetTitle(w: EmbedWidget): string {
  if (typeof w.title === 'string') return w.title;
  // SigNoz title may be a ReactNode; our UI only takes strings and falls back to id otherwise
  return w.id;
}
