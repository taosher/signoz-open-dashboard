/**
 * 看板变量解析（设计文档 §4.1 `var-*` / §7.4-4）。
 * 优先级：URL `var-*` > 看板 selectedValue > 解析默认值。
 * 变量一律按 `name` 归一（看板 JSON 以 id 为键，`normalizeVariables` 转为名键）。
 *
 * 类型：
 * - QUERY：经 `POST /api/v2/variables/query` 取候选值（依赖其他变量时先代入已知值）；
 * - DYNAMIC：经 `GET /api/v1/fields/values` 取 `normalizedValues`
 *  （source 为 All telemetry 时不限 signal）；
 * - CUSTOM：`customValue` 逗号切分；TEXTBOX：`textboxValue`；其他仅用自带值。
 * 默认选中：单选取 `defaultValue`（候选中）否则首个候选；多选默认全选候选
 * （`allSelected`/`showALLOption` 语义，嵌入页无历史选择时展示全量数据）。
 */
import { apiFetch } from './api';
import type { DashboardVariable } from './dashboard';

export type VariableValues = Record<string, unknown>;
export type VariableOptions = Record<string, (string | number | boolean)[]>;

export interface ResolvedVariables {
  values: VariableValues;
  options: VariableOptions;
}

const VAR_PATTERNS = (name: string): RegExp[] => [
  new RegExp(`\\$${escapeReg(name)}\\b`, 'g'),
  new RegExp(`\\{\\{\\s*\\.?${escapeReg(name)}\\s*\\}\\}`, 'g'),
  new RegExp(`\\[\\[\\s*${escapeReg(name)}\\s*\\]\\]`, 'g'),
];

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quoteIdent(v: string | number | boolean): string {
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  return String(v);
}

/** 依赖查询文本的本地预代入：字符串加引号（`$var` 在 filter 中由后端自行处理，此处只管 SQL 文本）。 */
function formatValueForQuery(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => quoteIdent(x as string | number | boolean)).join(',');
  if (v === null || v === undefined) return '';
  return quoteIdent(v as string | number | boolean);
}

export function substituteVarsText(text: string, values: VariableValues): string {
  let out = text;
  for (const [name, v] of Object.entries(values)) {
    const rep = formatValueForQuery(v);
    for (const re of VAR_PATTERNS(name)) out = out.replace(re, rep);
  }
  return out;
}

function splitCustom(v: DashboardVariable): (string | number | boolean)[] {
  const raw = typeof v.customValue === 'string' ? v.customValue : '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function toArray(v: unknown): (string | number | boolean)[] {
  if (Array.isArray(v)) return v.filter((x) => ['string', 'number', 'boolean'].includes(typeof x)) as (string | number | boolean)[];
  if (['string', 'number', 'boolean'].includes(typeof v)) return [v as string | number | boolean];
  return [];
}

/** 看板 JSON 的 variables 以 id 为键，此处按 `name` 归一（无名则弃）。 */
export function normalizeVariables(
  vars: Record<string, DashboardVariable> | undefined,
): Record<string, DashboardVariable> {
  const out: Record<string, DashboardVariable> = {};
  for (const [id, v] of Object.entries(vars ?? {})) {
    if (v && typeof v.name === 'string' && v.name !== '') out[v.name] = v;
    void id;
  }
  return out;
}

async function fetchQueryOptions(
  queryValue: string,
  known: VariableValues,
  time: { startMs: number; endMs: number },
  apiKey?: string,
  signal?: AbortSignal,
): Promise<(string | number | boolean)[]> {
  const startS = Math.floor(time.startMs / 1000);
  const endS = Math.floor(time.endMs / 1000);
  const body = {
    query: substituteVarsText(queryValue, known),
    variables: {
      ...known,
      start_timestamp: startS,
      end_timestamp: endS,
      start_timestamp_ms: time.startMs,
      end_timestamp_ms: time.endMs,
      start_timestamp_nano: time.startMs * 1e6,
      end_timestamp_nano: time.endMs * 1e6,
    },
  };
  const json = await apiFetch<{ data?: { variableValues?: (string | number | boolean)[] } }>(
    '/api/v2/variables/query',
    { method: 'POST', body, apiKey, signal },
  );
  const list = json.data?.variableValues;
  return Array.isArray(list) ? list : [];
}

async function fetchDynamicOptions(
  v: DashboardVariable,
  time: { startMs: number; endMs: number },
  apiKey?: string,
  signal?: AbortSignal,
): Promise<(string | number | boolean)[]> {
  const attr = typeof v.dynamicVariablesAttribute === 'string' ? v.dynamicVariablesAttribute : '';
  if (attr === '') return [];
  const source = String(v.dynamicVariablesSource ?? '').toLowerCase();
  const signalParam = source === 'all telemetry' || source === '' ? undefined : source;
  const q = new URLSearchParams({ name: attr });
  if (signalParam) q.set('signal', signalParam);
  const json = await apiFetch<{
    data?: {
      normalizedValues?: (string | number | boolean)[];
      values?: Record<string, (string | number | boolean)[]>;
    };
  }>(`/api/v1/fields/values?${q.toString()}`, { apiKey, signal });
  void time;
  const list = json.data?.normalizedValues;
  if (Array.isArray(list)) return list;
  // 兜底：values 按类型合并
  const out: (string | number | boolean)[] = [];
  for (const arr of Object.values(json.data?.values ?? {})) {
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
}

export async function resolveVariables(
  vars: Record<string, DashboardVariable> | undefined,
  opts: {
    urlVars: Record<string, string>;
    startMs: number;
    endMs: number;
    apiKey?: string;
    signal?: AbortSignal;
  },
): Promise<ResolvedVariables> {
  const values: VariableValues = {};
  const options: VariableOptions = {};
  if (!vars) return { values, options };

  // URL 优先（multiSelect 按逗号切分）
  const entries = Object.entries(vars).sort(
    ([, a], [, b]) => Number(a.order ?? 0) - Number(b.order ?? 0),
  );
  const pending: [string, DashboardVariable][] = [];
  for (const [id, v] of entries) {
    const name = v.name;
    if (!name) continue;
    const urlRaw = opts.urlVars[name];
    if (urlRaw !== undefined) {
      const val: unknown = v.multiSelect ? urlRaw.split(',').map((s) => s.trim()).filter((s) => s !== '') : urlRaw;
      values[name] = val;
      options[name] = toArray(val);
      void id;
    } else {
      pending.push([id, v]);
    }
  }

  // 多轮解析（依赖变量先出结果，最多 N+1 轮）
  let rest = pending;
  for (let pass = 0; pass <= pending.length && rest.length > 0; pass += 1) {
    const next: [string, DashboardVariable][] = [];
    let progressed = false;
    for (const [, v] of rest) {
      const name = v.name as string;
      try {
        if (v.type === 'QUERY' && v.queryValue) {
          const list = await fetchQueryOptions(
            v.queryValue,
            values,
            { startMs: opts.startMs, endMs: opts.endMs },
            opts.apiKey,
            opts.signal,
          );
          options[name] = list;
          values[name] = pickDefault(v, list);
          progressed = true;
        } else if (v.type === 'CUSTOM') {
          const list = splitCustom(v);
          options[name] = list;
          values[name] = pickDefault(v, list);
          progressed = true;
        } else if (v.type === 'DYNAMIC') {
          const list = await fetchDynamicOptions(
            v,
            { startMs: opts.startMs, endMs: opts.endMs },
            opts.apiKey,
            opts.signal,
          );
          options[name] = list;
          values[name] = pickDefault(v, list);
          progressed = true;
        } else if (v.type === 'TEXTBOX') {
          const t = typeof v.textboxValue === 'string' && v.textboxValue !== '' ? v.textboxValue : (v.selectedValue ?? '');
          options[name] = toArray(t);
          values[name] = t;
          progressed = true;
        } else {
          // TEXTBOX 之外其他类型：仅用自带值
          if (v.selectedValue !== undefined && v.selectedValue !== null) {
            values[name] = v.selectedValue;
            options[name] = toArray(v.selectedValue);
          } else if (v.defaultValue) {
            values[name] = v.defaultValue;
            options[name] = toArray(v.defaultValue);
          }
          progressed = true;
        }
      } catch {
        next.push(['', v]);
      }
    }
    rest = next;
    if (!progressed) break;
  }

  // dashboard 自带 selectedValue（非 URL）：候选就绪后若自带值有效则覆盖
  for (const [, v] of pending) {
    const name = v.name as string;
    if (opts.urlVars[name] !== undefined) continue;
    const sel = v.selectedValue;
    if (sel === undefined || sel === null || sel === '') continue;
    const optsList = options[name] ?? [];
    if (optsList.length === 0 || toArray(sel).every((x) => optsList.includes(x))) {
      values[name] = sel;
    }
  }

  return { values, options };
}

function pickDefault(v: DashboardVariable, list: (string | number | boolean)[]): unknown {
  if (v.multiSelect) {
    // 多选默认全选（嵌入无历史选择时展示全量）
    if (list.length > 0) return [...list];
    return v.selectedValue ?? [];
  }
  const def = typeof v.defaultValue === 'string' ? v.defaultValue : '';
  if (def !== '' && list.includes(def)) return def;
  if (list.length > 0) return list[0];
  return v.selectedValue ?? '';
}
