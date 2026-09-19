/**
 * 嵌入主应用（core 编排 + 主题渲染，设计文档 §7.4）。
 * 路由仅 `/embed/:dashboardId`（由 main.tsx 解析传入）。
 */
import { ConfigProvider, Empty, Spin } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { EmbedLocale } from '@signoz-open-dashboard/shared';
import { useEffect, useMemo, useState } from 'react';
import type { ParsedEmbedParams } from '@signoz-open-dashboard/shared';
import { normalizeRefresh } from '@signoz-open-dashboard/shared';
import { apiFetch } from './api';
import { useEmbedAuth } from './auth';
import { ColorModeProvider } from './colorMode';
import { widgetTitle, type EmbedWidget } from './dashboard';
import { toErrorProps } from './errors';
import { initIframeResizer } from './iframeChild';
import { syncUrl } from './replaceState';
import { refreshToMs, resolveTimeRange } from './time';
import { useDashboard } from './useDashboard';
import { useVariables } from './useVariables';
import { normalizeVariables } from './variables';
import { useWidgetQuery } from '../signoz/useWidgetQuery';
import type { ThemeModule } from '../themes/types';

type TimeState = { relativeTime: string } | { startTime: number; endTime: number };

function WidgetSlot(props: {
  theme: ThemeModule;
  widget: EmbedWidget;
  startMs: number;
  endMs: number;
  variables: Record<string, unknown>;
  refreshKey: number;
  ready: boolean;
  locale: EmbedLocale;
}): JSX.Element {
  const { data, loading, error, refreshing, refetch } = useWidgetQuery(props.widget, {
    startMs: props.startMs,
    endMs: props.endMs,
    variables: props.variables,
    refreshKey: props.refreshKey,
    enabled: props.ready,
  });
  const WidgetCard = props.theme.WidgetCard;
  return (
    <WidgetCard
      widget={props.widget}
      loading={loading}
      data={data}
      error={error}
      onRetry={() => refetch()}
      refreshing={refreshing}
      locale={props.locale}
      startMs={props.startMs}
      endMs={props.endMs}
    />
  );
}

export function EmbedApp(props: { theme: ThemeModule; params: ParsedEmbedParams; pathname: string; hadKeyInUrl: boolean }): JSX.Element {
  const { theme, params, pathname, hadKeyInUrl } = props;
  const { apiKey } = useEmbedAuth();
  const dash = useDashboard();
  const [timeState, setTimeState] = useState<TimeState>(() =>
    params.relativeTime !== null ? { relativeTime: params.relativeTime } : { startTime: params.startTime ?? 0, endTime: params.endTime ?? 0 },
  );
  const [refresh, setRefresh] = useState(params.refresh);
  const [mode, setMode] = useState(params.mode);
  const [locale, setLocale] = useState(params.locale);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});

  useEffect(() => {
    initIframeResizer();
    const onFsChange = (): void => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const refreshMs = refreshToMs(normalizeRefresh(refresh));
  useEffect(() => {
    if (refreshMs === null) return;
    const t = window.setInterval(() => setTick((k) => k + 1), refreshMs);
    return () => window.clearInterval(t);
  }, [refreshMs]);

  const { startMs, endMs } = useMemo(
    () =>
      resolveTimeRange(
        'relativeTime' in timeState ? { relativeTime: timeState.relativeTime, startTime: null, endTime: null } : { relativeTime: null, startTime: timeState.startTime, endTime: timeState.endTime },
        Date.now(),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeState, tick],
  );

  // 变量：解析一次（timeKey 变化才重解，不随轮询 tick），用户改选覆盖
  const timeKeyForVars =
    'relativeTime' in timeState ? timeState.relativeTime : `${timeState.startTime}-${timeState.endTime}`;
  const varsDef = useMemo(
    () => normalizeVariables(dash.dashboard?.data.variables),
    [dash.dashboard],
  );
  const resolvedVars = useVariables(
    varsDef,
    params.vars,
    timeKeyForVars,
    startMs,
    endMs,
  );
  const varValues = useMemo(
    () => ({ ...resolvedVars.values, ...overrides }),
    [resolvedVars.values, overrides],
  );
  const varsReady = !dash.loading && !resolvedVars.loading;

  // 状态变更回写地址栏（原生参数，不回写 env 默认 key；数组按逗号拼接）
  useEffect(() => {
    syncUrl(
      pathname,
      {
        ...params,
        relativeTime: 'relativeTime' in timeState ? timeState.relativeTime : null,
        startTime: 'relativeTime' in timeState ? null : timeState.startTime,
        endTime: 'relativeTime' in timeState ? null : timeState.endTime,
        refresh,
        mode,
        locale,
        vars: Object.fromEntries(
          Object.entries(varValues).map(([k, v]) => [k, Array.isArray(v) ? v.map(String).join(',') : String(v)]),
        ),
      },
      hadKeyInUrl,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeState, refresh, mode, locale, varValues]);

  // 预热 substitute_vars（有变量时）：失败不阻塞渲染
  useEffect(() => {
    if (!dash.dashboard || Object.keys(varValues).length === 0) return;
    void apiFetch('/api/v5/substitute_vars', {
      method: 'POST',
      body: { variables: varValues },
      apiKey,
    }).catch(() => undefined);
  }, [dash.dashboard, varValues, apiKey]);

  const Toolbar = theme.Toolbar;
  const ErrorState = theme.ErrorState;
  const Tokens = theme.TokensProvider;

  if (dash.loading) {
    return (
      <ColorModeProvider mode={mode}>
        <Tokens>
          <div style={{ padding: 64, textAlign: 'center' }}>
            <Spin size="large">
              <div style={{ padding: 24 }} />
            </Spin>
          </div>
        </Tokens>
      </ColorModeProvider>
    );
  }
  if (dash.error || !dash.dashboard) {
    return (
      <ColorModeProvider mode={mode}>
        <Tokens>
          <ErrorState {...toErrorProps(dash.error, dash.reload, locale)} />
        </Tokens>
      </ColorModeProvider>
    );
  }

  const dd = dash.dashboard.data;
  const widgets = (dd.widgets ?? []).filter((w) => String(w.panelTypes) !== 'row' && w.id);
  const layoutById = new Map((dd.layout ?? []).map((l) => [l.i, l]));
  // 按看板 layout (y,x) 排序后再按 w 跨列，复刻控制台排版（App 只做顺序+跨列，不解释 x 偏移）
  const ordered = [...widgets].sort((a, b) => {
    const la = layoutById.get(a.id);
    const lb = layoutById.get(b.id);
    return (la?.y ?? 0) - (lb?.y ?? 0) || (la?.x ?? 0) - (lb?.x ?? 0);
  });
  const variables = varsDef;

  const toggleFullscreen = (): void => {
    if (document.fullscreenElement != null) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  };

  return (
    <ColorModeProvider mode={mode}>
      <Tokens>
        <ConfigProvider locale={locale === 'en' ? enUS : zhCN}>
    <div style={{ minHeight: '100vh' }}>
      <Toolbar
        title={dd.title}
        showTitle={params.title}
        showToolbar={params.toolbar}
        variables={variables}
        variableValues={varValues}
        variableOptions={resolvedVars.options}
        onVariableChange={(name, value) => setOverrides((prev) => ({ ...prev, [name]: value }))}
        relativeTime={'relativeTime' in timeState ? timeState.relativeTime : null}
        startTime={'relativeTime' in timeState ? null : timeState.startTime}
        endTime={'relativeTime' in timeState ? null : timeState.endTime}
        onTimeChange={(t) => setTimeState(t)}
        refresh={refresh}
        onRefreshChange={(r) => setRefresh(r)}
        mode={mode}
        onModeChange={(m) => setMode(m)}
        timeControl={params.timeControl}
        refreshControl={params.refreshControl}
        modeControl={params.modeControl}
        fullscreenControl={params.fullscreenControl}
        localeControl={params.localeControl}
        locale={locale}
        onLocaleChange={(l) => setLocale(l)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
      />
      {/* 页面底色/间距由主题经 CSS 变量提供（--embed-page-bg/--embed-page-pad/--embed-grid-gap），core 只给 fallback。
          12 列 grid 按看板 layout 跨列（gap 由 grid 原生处理，无需 calc 抵扣，换 gap 不会再挤换行，见 bug-track） */}
      <div style={{ padding: 'var(--embed-page-pad, 12px)' }}>
        {ordered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 'var(--embed-grid-gap, 12px)',
            }}
          >
            {ordered.map((w) => {
              const l = layoutById.get(w.id);
              const span = l ? Math.max(1, Math.min(12, Math.round(l.w))) : 12;
              const hPx = l ? Math.max(300, l.h * 34) : 320;
              return (
                <div key={w.id} style={{ gridColumn: `span ${span}`, minWidth: 0 }} title={widgetTitle(w)}>
                  <div style={{ height: hPx }}>
                    <WidgetSlot
                      theme={theme}
                      widget={w}
                      startMs={startMs}
                      endMs={endMs}
                      variables={varValues}
                      refreshKey={tick}
                      ready={varsReady}
                      locale={locale}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
        </ConfigProvider>
      </Tokens>
    </ColorModeProvider>
  );
}
