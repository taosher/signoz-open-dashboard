/**
 * Shadcn WidgetCard: dispatch by panelTypes (graph/table/list/pie/bar/histogram/value).
 * Time-series/bar/pie use Recharts (mirroring ui.shadcn chart: ChartContainer composition),
 * tables use shadcn-style table; unit formatting reuses `signoz/format`.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCallback, useId, useMemo, useState } from 'react';
import { useColorMode } from '../../core/colorMode';
import { renderMarkdown } from '../../core/markdown';
import { shortTime } from '../../signoz/formatTime';
import { widgetTitle } from '../../core/dashboard';
import {
  chartClickContext,
  numberClickContext,
  pieClickContext,
  tableClickContext,
  type DrilldownClickPayload,
  type QueryMeta,
} from '../../core/drilldown';
import { toErrorProps } from '../../core/errors';
import { formatValue } from '../../signoz/format';
import type { UiSeries, UiTable } from '../../signoz/v5Response';
import type { WidgetProps } from '../types';
import type { EmbedLocale } from '@signoz-open-dashboard/shared';
import { ShadcnErrorState } from './ShadcnErrorState';
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  SCHN_CHART_COLORS_DARK,
  SCHN_CHART_COLORS_LIGHT,
  type ChartConfig,
} from './chart';
import { shadcnStrings } from './locale';
import { SchnCard, SchnEmpty, SchnScrollArea, SchnSkeleton } from './ui';

function MarkdownText({ value }: { value: string }): JSX.Element {
  const html = useMemo(() => renderMarkdown(value), [value]);
  return (
    <div
      className="schn-markdown prose prose-zinc max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function fullTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface RowSeries {
  keys: string[];
  rows: Record<string, number>[];
  config: ChartConfig;
}

function toRows(series: UiSeries[], colors: string[]): RowSeries {
  const times = new Map<number, Record<string, number>>();
  const keys: string[] = [];
  const config: ChartConfig = {};
  series.forEach((s, i) => {
    const key = `s${i}`;
    keys.push(key);
    config[key] = { label: s.legend, color: colors[i % colors.length] };
    for (const p of s.points) {
      let row = times.get(p.t);
      if (!row) {
        row = { t: p.t };
        times.set(p.t, row);
      }
      row[key] = p.v;
    }
  });
  const rows = [...times.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
  return { keys, rows, config };
}

/** Native `enrichChartClick` for time-series and bar renderers: clicked series + clicked bucket. */
function useChartClick(params: {
  series: UiSeries[];
  colors: string[];
  queries: QueryMeta[];
  onPointClick?: (payload: DrilldownClickPayload) => void;
}): (state: { activeDataKey?: unknown; activeLabel?: unknown }, event: React.MouseEvent<SVGGraphicsElement>) => void {
  const { series, colors, queries, onPointClick } = params;
  return useCallback(
    (state, event) => {
      if (!onPointClick || state.activeDataKey === undefined) return;
      const index = Number(String(state.activeDataKey).replace(/^s/, ''));
      const clicked = series[index];
      if (!clicked || clicked.points.length === 0) return;
      const bucketMs = Number(state.activeLabel);
      const bucket = Number.isFinite(bucketMs) ? bucketMs : clicked.points[clicked.points.length - 1].t;
      const payload = chartClickContext({
        point: { x: event.clientX, y: event.clientY },
        queryName: clicked.queryName,
        labels: clicked.labels,
        legend: clicked.legend,
        color: colors[index % colors.length],
        timestamp: Math.floor(bucket / 1000),
        queries,
      });
      if (payload) onPointClick(payload);
    },
    [onPointClick, series, colors, queries],
  );
}

function SchnTimeSeries(props: {
  series: UiSeries[];
  unit?: string;
  locale?: EmbedLocale;
  onPointClick?: (payload: DrilldownClickPayload) => void;
  queries: QueryMeta[];
}): JSX.Element {
  const { series, unit, locale, onPointClick, queries } = props;
  const dark = useColorMode() === 'dark';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const colors = dark ? SCHN_CHART_COLORS_DARK : SCHN_CHART_COLORS_LIGHT;
  const { keys, rows, config } = toRows(series, colors);
  const grid = dark ? '#27272a' : '#e4e4e7';
  const tick = dark ? '#a1a1aa' : '#71717a';

  // Native `enrichChartClick`: resolve the clicked series (dataKey → series) plus its bucket.
  const handleClick = useChartClick({ series, colors, queries, onPointClick });

  if (rows.length === 0) return <SchnEmpty text={shadcnStrings(locale ?? 'zh').noData} />;
  return (
    <ChartContainer config={config} className="min-h-[180px] flex-1">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onClick={onPointClick ? handleClick : undefined}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k} id={`${uid}-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config[k].color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={config[k].color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(t: number) => shortTime(Number(t))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v: number) => formatValue(Number(v), unit)}
        />
        <Tooltip
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 100 }}
          content={
            <ChartTooltipContent labelFormatter={fullTime} formatValue={(v) => formatValue(v, unit)} />
          }
        />
        <Legend content={<ChartLegendContent />} />
        {keys.map((k) => (
          <Area
            key={k}
            dataKey={k}
            name={config[k].label}
            stroke={config[k].color}
            fill={`url(#${uid}-${k})`}
            strokeWidth={2}
            dot={false}
            type="monotone"
            connectNulls
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

function SchnBars(props: {
  series: UiSeries[];
  unit?: string;
  locale?: EmbedLocale;
  onPointClick?: (payload: DrilldownClickPayload) => void;
  queries: QueryMeta[];
}): JSX.Element {
  const { series, unit, locale, onPointClick, queries } = props;
  const dark = useColorMode() === 'dark';
  const colors = dark ? SCHN_CHART_COLORS_DARK : SCHN_CHART_COLORS_LIGHT;
  const { keys, rows, config } = toRows(series, colors);
  const grid = dark ? '#27272a' : '#e4e4e7';
  const tick = dark ? '#a1a1aa' : '#71717a';

  // Bars share the time-series click semantics (clicked series + clicked bucket ± step).
  const handleClick = useChartClick({ series, colors, queries, onPointClick });

  if (rows.length === 0) return <SchnEmpty text={shadcnStrings(locale ?? 'zh').noData} />;
  return (
    <ChartContainer config={config} className="min-h-[180px] flex-1">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onClick={onPointClick ? handleClick : undefined}>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(t: number) => shortTime(Number(t))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v: number) => formatValue(Number(v), unit)}
        />
        <Tooltip
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ zIndex: 100 }}
          content={
            <ChartTooltipContent labelFormatter={fullTime} formatValue={(v) => formatValue(v, unit)} />
          }
        />
        <Legend content={<ChartLegendContent />} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} name={config[k].label} fill={config[k].color} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function SchnPie(props: {
  tables: UiTable[];
  series: UiSeries[];
  unit?: string;
  locale?: EmbedLocale;
  onPointClick?: (payload: DrilldownClickPayload) => void;
  queries: QueryMeta[];
  timeRange: { startTime: number; endTime: number };
}): JSX.Element {
  const { tables, series, unit, locale, onPointClick, queries, timeRange } = props;
  const dark = useColorMode() === 'dark';
  const colors = dark ? SCHN_CHART_COLORS_DARK : SCHN_CHART_COLORS_LIGHT;
  // Slices keep their source series (labels + query name) so a click carries native filter semantics.
  const columnItems: { name: string; value: number; source?: UiSeries }[] = tables.flatMap((t) =>
    t.columns
      .filter((c) => c.isValue)
      .map((c) => {
        let v = 0;
        for (const r of t.rows) {
          const n = Number(r[c.id]);
          if (Number.isFinite(n)) v += n;
        }
        return { name: c.name, value: v, source: series.find((s) => s.queryName === c.queryName) };
      }),
  );
  const seen = new Set<string>();
  const seriesItems: { name: string; value: number; source?: UiSeries }[] = [];
  for (const s of series) {
    if (s.points.length === 0 || seen.has(s.legend)) continue;
    seen.add(s.legend);
    seriesItems.push({ name: s.legend, value: s.points[s.points.length - 1].v, source: s });
  }
  const items = (columnItems.length > 0 ? columnItems : seriesItems).filter((it) => it.value > 0);
  const total = items.reduce((s, it) => s + it.value, 0);
  if (items.length === 0) return <SchnEmpty text={shadcnStrings(locale ?? 'zh').noData} />;
  const config: ChartConfig = {};
  items.forEach((it, i) => {
    config[`p${i}`] = { label: it.name, color: colors[i % colors.length] };
  });

  // Native `enrichPieClick`: the slice's group-by labels become equality filters.
  const handleSliceClick = (
    _data: unknown,
    index: number,
    event: React.MouseEvent<SVGGraphicsElement>,
  ): void => {
    if (!onPointClick) return;
    const item = items[index];
    if (!item) return;
    const payload = pieClickContext({
      point: { x: event.clientX, y: event.clientY },
      queryName: item.source?.queryName ?? '',
      labels: item.source?.labels ?? {},
      label: item.name,
      color: colors[index % colors.length],
      timeRange,
      queries,
    });
    if (payload) onPointClick(payload);
  };

  return (
    <div className="relative min-h-[180px] flex-1">
      <ChartContainer config={config} className="absolute inset-0">
        <PieChart>
          <Tooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 100 }} content={<ChartTooltipContent formatValue={(v) => formatValue(v, unit)} />} />
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="44%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            strokeWidth={0}
            onClick={onPointClick ? handleSliceClick : undefined}
          >
            {items.map((_it, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[88%] items-center justify-center">
        <span className="text-xl font-bold text-zinc-950 dark:text-zinc-50">{formatValue(total, unit)}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            {it.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function SchnTable(props: {
  tables: UiTable[];
  unit?: string;
  locale?: EmbedLocale;
  onCellClick?: (payload: DrilldownClickPayload) => void;
  queries: QueryMeta[];
  timeRange: { startTime: number; endTime: number };
}): JSX.Element {
  const { tables, unit, locale, onCellClick, queries, timeRange } = props;
  const t = shadcnStrings(locale ?? 'zh');
  const t0 = tables[0];
  const [page, setPage] = useState(0);
  const pageSize = 10;
  if (!t0 || t0.columns.length === 0) return <SchnEmpty text={t.noData} />;
  const maxPage = Math.max(1, Math.ceil(t0.rows.length / pageSize));
  const safePage = Math.min(page, maxPage - 1);
  const rows = t0.rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <SchnScrollArea>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-zinc-950">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {t0.columns.map((c) => (
                  <th key={c.id} className="whitespace-nowrap bg-zinc-50 px-2 py-2 text-left align-middle font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/60">
                  {t0.columns.map((c) => {
                    const v = r[c.id];
                    return (
                      <td
                        key={c.id}
                        onClick={
                          onCellClick
                            ? (event) => {
                                const payload = tableClickContext({
                                  point: { x: event.clientX, y: event.clientY },
                                  record: r,
                                  columnId: c.id,
                                  columns: t0.columns,
                                  timeRange,
                                  queries,
                                });
                                if (payload) onCellClick(payload);
                              }
                            : undefined
                        }
                        className={
                          onCellClick
                            ? 'max-w-[240px] truncate px-2 py-1.5 tabular-nums text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400'
                            : 'max-w-[240px] truncate px-2 py-1.5 tabular-nums text-zinc-900 dark:text-zinc-100'
                        }
                      >
                        {typeof v === 'number' ? formatValue(v, unit) : String(v ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </SchnScrollArea>
      </div>
      {maxPage > 1 ? (
        <div className="flex items-center justify-end gap-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="tabular-nums">
            {safePage + 1} / {maxPage}
          </span>
          <button
            className="rounded-md border border-zinc-200 px-2 py-0.5 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            {t.prevPage}
          </button>
          <button
            className="rounded-md border border-zinc-200 px-2 py-0.5 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={safePage >= maxPage - 1}
            onClick={() => setPage(safePage + 1)}
          >
            {t.nextPage}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ShadcnWidgetCard(props: WidgetProps): JSX.Element {
  const { widget, loading, data, error, onRetry, startMs, endMs } = props;
  const title = widgetTitle(widget);
  const panel = String(widget.panelTypes ?? '');
  const t = shadcnStrings(props.locale ?? 'zh');
  const queries = data?.queries ?? [];
  // Scalar/table/pie clicks carry the fetched window (native behaviour).
  const timeRange = { startTime: Math.floor(startMs / 1000), endTime: Math.floor(endMs / 1000) };
  // Histogram and List opt out of drill-down (native `actions.drilldown = false`).
  const drillable = panel !== 'histogram' && panel !== 'list';
  const onDrilldownClick = drillable ? props.onDrilldownClick : undefined;

  let body: JSX.Element;
  if (loading && !data) {
    body = <SchnSkeleton />;
  } else if (error && !data) {
    // No sizing override needed: the component fills whatever flex box it is given.
    body = <ShadcnErrorState {...toErrorProps(error, onRetry, props.locale)} />;
  } else if (panel === 'graph') {
    body = (
      <SchnTimeSeries
        series={data?.series ?? []}
        unit={widget.yAxisUnit}
        locale={props.locale}
        onPointClick={onDrilldownClick}
        queries={queries}
      />
    );
  } else if (panel === 'bar' || panel === 'histogram') {
    body = (
      <SchnBars
        series={data?.series ?? []}
        unit={widget.yAxisUnit}
        locale={props.locale}
        onPointClick={onDrilldownClick}
        queries={queries}
      />
    );
  } else if (panel === 'pie') {
    body = (
      <SchnPie
        tables={data?.tables ?? []}
        series={data?.series ?? []}
        unit={widget.yAxisUnit}
        locale={props.locale}
        onPointClick={onDrilldownClick}
        queries={queries}
        timeRange={timeRange}
      />
    );
  } else if (panel === 'value') {
    const tables = data?.tables ?? [];
    const firstRow = tables[0]?.rows[0];
    const firstCol = tables[0]?.columns.find((c) => c.isValue) ?? tables[0]?.columns[0];
    const raw = firstRow && firstCol ? Number(firstRow[firstCol.id]) : NaN;
    const singleSeries = data?.series[0];
    const single = singleSeries && singleSeries.points.length > 0 ? singleSeries.points[singleSeries.points.length - 1].v : NaN;
    const v = Number.isFinite(raw) ? raw : single;
    // Native `enrichNumberClick`: the whole card is the value; no filters, panel window.
    const queryName = firstCol?.queryName ?? singleSeries?.queryName ?? '';
    const handleClick = onDrilldownClick
      ? (event: React.MouseEvent<HTMLDivElement>): void => {
          const payload = numberClickContext({
            point: { x: event.clientX, y: event.clientY },
            queryName,
            timeRange,
            queries,
          });
          if (payload) onDrilldownClick(payload);
        }
      : undefined;
    body = Number.isFinite(v) ? (
      <div
        role={handleClick ? 'button' : undefined}
        tabIndex={handleClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={
          handleClick
            ? (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                handleClick({
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                } as React.MouseEvent<HTMLDivElement>);
              }
            : undefined
        }
        className={
          handleClick
            ? 'flex flex-1 cursor-pointer items-center justify-center rounded text-4xl font-bold tabular-nums'
            : 'flex flex-1 items-center justify-center text-4xl font-bold tabular-nums'
        }
      >
        {formatValue(v, widget.yAxisUnit)}
      </div>
    ) : (
      <SchnEmpty text={t.noData} />
    );
  } else if (panel === 'table' || panel === 'list') {
    body = (
      <SchnTable
        tables={data?.tables ?? []}
        unit={widget.yAxisUnit}
        locale={props.locale}
        onCellClick={onDrilldownClick}
        queries={queries}
        timeRange={timeRange}
      />
    );
  } else if (panel === 'text') {
    body = <MarkdownText value={widget.text ?? ''} />;
  } else {
    body = <SchnEmpty text={`${t.unsupportedPanel}：${panel}`} />;
  }

  return (
    <SchnCard
      title={title}
      description={widget.description}
      extra={
        props.refreshing ? (
          <span className="text-[11px] text-zinc-400" title="refreshing">
            {t.updating}
          </span>
        ) : undefined
      }
    >
      {body}
    </SchnCard>
  );
}
