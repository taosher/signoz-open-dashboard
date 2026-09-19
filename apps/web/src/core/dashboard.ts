/**
 * Dashboard 类型（自研 UI 自有契约，仅取渲染所需子集，未知字段透传不校验）。
 * 对照：SigNoz 0.97.0 `frontend/src/types/api/dashboard/getAll.ts`。
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
  // 其余聚合/filter/groupBy 等保持原样透传给 signoz/queryPayload
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

/** 上游 `GET /api/v1/dashboards/:id` 包络有 `{data:{...}}` 与 `{data:{data:{...}}}` 两种形态。 */
export function unwrapDashboard(json: unknown): DashboardPayload | null {
  const root = (json ?? {}) as Record<string, unknown>;
  const d1 = root.data as Record<string, unknown> | undefined;
  if (!d1) return null;
  // 形态 A：{ data: { id, data: {...} } }
  if (d1.data && typeof d1.data === 'object') {
    const inner = d1.data as Record<string, unknown>;
    if (typeof d1.id === 'string') {
      return { id: d1.id, data: inner as unknown as DashboardData };
    }
  }
  // 形态 B：{ data: { title, widgets } }（无 id 包裹时用请求 id 兜底由调用方补）
  if (Array.isArray((d1 as Record<string, unknown>).widgets) || typeof (d1 as Record<string, unknown>).title === 'string') {
    return { id: typeof d1.id === 'string' ? (d1.id as string) : '', data: d1 as unknown as DashboardData };
  }
  return null;
}

export function widgetTitle(w: EmbedWidget): string {
  if (typeof w.title === 'string') return w.title;
  // SigNoz title 可能是 ReactNode；自研只取字符串，其余回退 id
  return w.id;
}
