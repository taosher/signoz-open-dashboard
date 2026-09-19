/**
 * shadcn 风格图表（对照 https://ui.shadcn.com/docs/components/base/chart ：
 * Recharts v3 做渲染，`ChartContainer/ChartTooltipContent/ChartLegendContent`
 * 只做主题与排版，不包新抽象；单位格式化经 `formatValue` 注入）。
 */
import { ResponsiveContainer, Legend } from 'recharts';
import type { ReactNode } from 'react';
import { formatValue } from '../../signoz/format';

export type ChartConfig = Record<string, { label?: string; color?: string }>;

/** 明暗各 8 色：整体偏蓝（对照 shadcn area 蓝调），多 series 仍可区分。 */
export const SCHN_CHART_COLORS_LIGHT = [
  '#2563eb',
  '#0ea5e9',
  '#4f46e5',
  '#0891b2',
  '#0284c7',
  '#38bdf8',
  '#6366f1',
  '#22d3ee',
];
export const SCHN_CHART_COLORS_DARK = [
  '#60a5fa',
  '#38bdf8',
  '#818cf8',
  '#22d3ee',
  '#7dd3fc',
  '#67e8f9',
  '#a5b4fc',
  '#2dd4bf',
];

/** 图例/tooltip 超长收敛：最多展示项数，超出以 `+N` 收尾（40+ series 不再撑爆布局）。 */
export const MAX_LEGEND_ITEMS = 12;

export function ChartContainer({
  config,
  children,
  className,
}: {
  config: ChartConfig;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    if (v.color) vars[`--color-${k}`] = v.color;
  }
  return (
    <div className={className} style={{ width: '100%', height: '100%', ...vars }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltipContent(props: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string | number;
  labelFormatter?: (t: number) => string;
  formatValue?: (v: number) => string;
  maxItems?: number;
}): JSX.Element | null {
  const { active, payload, label, labelFormatter, formatValue: fmt, maxItems = MAX_LEGEND_ITEMS } = props;
  if (!active || !payload || payload.length === 0) return null;
  const fmtValue = (v: number): string => (fmt ? fmt(v) : formatValue(v, undefined));
  const shown = payload.slice(0, maxItems);
  const rest = payload.length - shown.length;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
      {label !== undefined && label !== '' ? (
        <div className="mb-1.5 font-medium text-zinc-950 dark:text-zinc-50">
          {labelFormatter && typeof label === 'number' ? labelFormatter(label) : String(label)}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {shown.map((p, i) => {
          const name = String(p?.name ?? '');
          const value = Number(p?.value);
          const color = String(p?.color ?? p?.payload?.fill ?? '#999');
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
              <span className="ml-auto pl-4 text-right font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                {Number.isFinite(value) ? fmtValue(value) : '-'}
              </span>
            </div>
          );
        })}
        {rest > 0 ? (
          <div className="text-right text-[11px] text-zinc-400">+{rest}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ChartLegendContent(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  maxItems?: number;
}): JSX.Element | null {
  const { payload, maxItems = MAX_LEGEND_ITEMS } = props;
  if (!payload || payload.length === 0) return null;
  const shown = payload.slice(0, maxItems);
  const rest = payload.length - shown.length;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs">
      {shown.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: String(p?.color ?? '#999') }}
          />
          {String(p?.value ?? '')}
        </span>
      ))}
      {rest > 0 ? <span className="text-zinc-400">+{rest}</span> : null}
    </div>
  );
}

export { Legend };
