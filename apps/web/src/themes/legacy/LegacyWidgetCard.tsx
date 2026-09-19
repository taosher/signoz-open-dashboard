/**
 * legacy WidgetCard：按 panelTypes 分发渲染
 *（graph/table/list/pie/bar/histogram/value；row 由 App 展平不进卡片）。
 * 图表用 echarts 系自研实现，视觉贴近即可（设计文档 §7.3）。
 */
import { Card, Empty, Spin, Statistic, Table } from 'antd';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { EmbedLocale } from '@signoz-open-dashboard/shared';
import { chartForeground, useColorMode } from '../../core/colorMode';
import { toErrorProps } from '../../core/errors';
import { widgetTitle } from '../../core/dashboard';
import { formatValue } from '../../signoz/format';
import type { UiSeries, UiTable } from '../../signoz/v5Response';
import type { WidgetProps } from '../types';
import { LegacyErrorState } from './LegacyErrorState';
import { legacyStrings } from './locale';

function useEcharts(
  ref: React.RefObject<HTMLDivElement>,
  option: echarts.EChartsCoreOption | null,
): void {
  const chartRef = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(el);
    }
    const chart = chartRef.current;
    if (option) {
      chart.setOption(option, true);
    } else {
      chart.clear();
    }
    const onResize = (): void => {
      if (ref.current) chart.resize();
    };
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [ref, option]);
  useEffect(
    () => () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    },
    [],
  );
}

const PALETTE = ['#2278cf', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#a0d911'];

function formatTimeTick(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** axis tooltip：时间标题 + 两列对齐表格（名左值右，数字等宽）。 */
function axisTooltipFormatter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  unit: string | undefined,
): string {
  const list = (Array.isArray(params) ? params : [params]) as {
    seriesName?: string;
    value?: [number, number];
    marker?: string;
  }[];
  if (list.length === 0) return '';
  const t = Number(list[0].value?.[0]);
  const rows = list
    .map((p) => {
      const v = Number(p.value?.[1]);
      return `<tr><td style="padding-right:16px">${p.marker ?? ''}${escapeHtml(p.seriesName ?? '')}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${escapeHtml(formatValue(v, unit))}</td></tr>`;
    })
    .join('');
  return `<div style="margin-bottom:4px">${escapeHtml(formatTimeTick(t))}</div><table style="border-spacing:0">${rows}</table>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function seriesOption(series: UiSeries[], unit: string | undefined, dark: boolean): echarts.EChartsCoreOption {
  const fg = chartForeground(dark ? 'dark' : 'light');
  return {
    animation: false,
    color: PALETTE,
    textStyle: { color: fg.text },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: fg.tooltipBg,
      textStyle: { color: fg.text },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any): string => axisTooltipFormatter(params, unit),
    },
    legend: { type: 'scroll', bottom: 2, textStyle: { color: fg.text } },
    grid: { left: 8, right: 12, top: 16, bottom: 64, containLabel: true },
    xAxis: { type: 'time', axisLabel: { hideOverlap: true, color: fg.text } },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: fg.text,
        formatter: (v: number) => formatValue(v, unit),
      },
    },
    series: series.map((s) => ({
      name: s.legend,
      type: 'line',
      showSymbol: false,
      data: s.points.map((p) => [p.t, p.v]),
    })),
  };
}

function TimeSeriesChart({ series, unit, locale }: { series: UiSeries[]; unit?: string; locale?: EmbedLocale }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useColorMode() === 'dark';
  const t = legacyStrings(locale ?? 'zh');
  const option = series.length > 0 ? seriesOption(series, unit, dark) : null;
  useEcharts(ref, option);
  if (series.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.noData} />;
  return <div ref={ref} style={{ flex: 1, minHeight: 0, width: '100%' }} />;
}

function BarChart({ series, unit, locale }: { series: UiSeries[]; unit?: string; locale?: EmbedLocale }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useColorMode() === 'dark';
  const t = legacyStrings(locale ?? 'zh');
  const fg = chartForeground(dark ? 'dark' : 'light');
  const option: echarts.EChartsCoreOption | null =
    series.length > 0
      ? {
          animation: false,
          color: PALETTE,
          textStyle: { color: fg.text },
          tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: fg.tooltipBg,
            textStyle: { color: fg.text },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any): string => axisTooltipFormatter(params, unit),
          },
          legend: { type: 'scroll', bottom: 2, textStyle: { color: fg.text } },
          grid: { left: 8, right: 12, top: 16, bottom: 64, containLabel: true },
          xAxis: { type: 'time', axisLabel: { color: fg.text } },
          yAxis: { type: 'value', axisLabel: { color: fg.text, formatter: (v: number) => formatValue(v, unit) } },
          series: series.map((s) => ({
            name: s.legend,
            type: 'bar',
            data: s.points.map((p) => [p.t, p.v]),
          })),
        }
      : null;
  useEcharts(ref, option);
  if (series.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.noData} />;
  return <div ref={ref} style={{ flex: 1, minHeight: 0, width: '100%' }} />;
}

function PieChart({ tables, series, unit, locale }: { tables: UiTable[]; series: UiSeries[]; unit?: string; locale?: EmbedLocale }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useColorMode() === 'dark';
  const t = legacyStrings(locale ?? 'zh');
  const fg = chartForeground(dark ? 'dark' : 'light');
  // scalar 口径有两种形态：列式（columns+data）按列名分片；
  // 序列式（aggregations+series，如本看板 pie）取各 query 最新值，名取 query 图例
  const columnItems = tables.flatMap((t: UiTable) =>
    t.columns
      .filter((c: UiTable['columns'][number]) => c.isValue)
      .map((c: UiTable['columns'][number]) => {
        let v = 0;
        for (const r of t.rows) {
          const n = Number(r[c.id]);
          if (Number.isFinite(n)) v += n;
        }
        return { name: c.name, value: v };
      }),
  );
  const seen = new Set<string>();
  const seriesItems: { name: string; value: number }[] = [];
  for (const s of series) {
    if (s.points.length === 0 || seen.has(s.legend)) continue;
    seen.add(s.legend);
    seriesItems.push({ name: s.legend, value: s.points[s.points.length - 1].v });
  }
  const items = columnItems.length > 0 ? columnItems : seriesItems;
  const total = items.reduce((s, it) => s + it.value, 0);
  const option: echarts.EChartsCoreOption | null =
    items.length > 0
      ? {
          animation: false,
          color: PALETTE,
          textStyle: { color: fg.text },
          tooltip: {
            trigger: 'item',
            confine: true,
            backgroundColor: fg.tooltipBg,
            textStyle: { color: fg.text },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (p: any): string =>
              `${p.marker ?? ''}${p.name ?? ''}　${formatValue(Number(p.value), unit)}`,
          },
          legend: { type: 'scroll', bottom: 2, textStyle: { color: fg.text } },
          series: [
            {
              type: 'pie',
              radius: ['50%', '66%'],
              center: ['50%', '44%'],
              label: {
                formatter: (p: { name?: string; value?: number }): string =>
                  `${p.name ?? ''}\n${formatValue(Number(p.value), unit)}`,
              },
              labelLine: { show: true, length: 12, length2: 8 },
              labelLayout: { hideOverlap: true },
              data: items,
            },
          ],
        }
      : null;
  useEcharts(ref, option);
  if (items.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.noData} />;
  // 中心总值用 HTML 叠加（flex 居中），不受饼图半径/图例布局影响
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      <div
        // 与饼心（center 44%）对齐：百分比 height 相对父高度解析，避开百分比 padding 相对宽度解析的坑
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '88%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontSize: 21,
          fontWeight: 700,
          color: dark ? '#ffffff' : '#111111',
        }}
      >
        {formatValue(total, unit)}
      </div>
    </div>
  );
}

export function LegacyWidgetCard(props: WidgetProps): JSX.Element {
  const { widget, loading, data, error, onRetry } = props;
  const title = widgetTitle(widget);
  const panel = String(widget.panelTypes ?? '');
  const t = legacyStrings(props.locale ?? 'zh');

  let body: JSX.Element;
  if (loading && !data) {
    body = (
      <div style={{ flex: 1, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large">
          <div style={{ padding: 16 }} />
        </Spin>
      </div>
    );
  } else if (error && !data) {
    body = <LegacyErrorState {...toErrorProps(error, onRetry)} />;
  } else if (panel === 'graph') {
    body = <TimeSeriesChart series={data?.series ?? []} unit={widget.yAxisUnit} locale={props.locale} />;
  } else if (panel === 'bar' || panel === 'histogram') {
    body = <BarChart series={data?.series ?? []} unit={widget.yAxisUnit} locale={props.locale} />;
  } else if (panel === 'pie') {
    body = <PieChart tables={data?.tables ?? []} series={data?.series ?? []} unit={widget.yAxisUnit} locale={props.locale} />;
  } else if (panel === 'value') {
    const tables = data?.tables ?? [];
    const firstRow = tables[0]?.rows[0];
    const firstCol = tables[0]?.columns.find((c) => c.isValue) ?? tables[0]?.columns[0];
    const raw = firstRow && firstCol ? Number(firstRow[firstCol.id]) : NaN;
    const singleSeries = data?.series[0];
    const single = singleSeries && singleSeries.points.length > 0 ? singleSeries.points[singleSeries.points.length - 1].v : NaN;
    // 列式 scalar 取首行首值列；序列式 scalar 取首 series 最新值
    const v = Number.isFinite(raw) ? raw : single;
    body = (
      <div style={{ flex: 1, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Number.isFinite(v) ? (
          <Statistic value={formatValue(v, widget.yAxisUnit)} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.noData} />
        )}
      </div>
    );
  } else if (panel === 'table' || panel === 'list') {
    const tables = data?.tables ?? [];
    const t0 = tables[0];
    if (!t0 || t0.columns.length === 0) {
      body = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.noData} />;
    } else {
      body = (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Table
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 'max-content', y: 200 }}
            dataSource={t0.rows.map((r: Record<string, unknown>, i: number) => ({ key: i, ...r }))}
            columns={t0.columns.map((c: { id: string; name: string }) => ({
              title: c.name,
              dataIndex: c.id,
              key: c.id,
              ellipsis: true,
              render: (v: unknown) => (typeof v === 'number' ? formatValue(v, widget.yAxisUnit) : String(v ?? '')),
            }))}
          />
        </div>
      );
    }
  } else {
    body = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${t.unsupportedPanel}：${panel}`} />;
  }

  return (
    <Card
      size="small"
      title={title}
      extra={
        props.refreshing ? (
          <span style={{ fontSize: 12, color: '#999' }} title="refreshing">
            {t.updating}
          </span>
        ) : undefined
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 8, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      {body}
    </Card>
  );
}
