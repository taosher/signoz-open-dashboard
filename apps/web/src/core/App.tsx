/**
 * 嵌入主应用（core 编排 + 主题渲染，设计文档 §7.4）。
 * 路由仅 `/embed/:dashboardId`（由 main.tsx 解析传入）。
 */
import { Empty, Spin } from 'antd';
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
}): JSX.Element {
  const { data, loading, error } = useWidgetQuery(props.widget, {
    startMs: props.startMs,
    endMs: props.endMs,
    variables: props.variables,
    refreshKey: props.refreshKey,
    enabled: props.ready,
  });
  const [retryKey, setRetryKey] = useState(0);
  void retryKey;
  const WidgetCard = props.theme.WidgetCard;
  return (
    <WidgetCard
      widget={props.widget}
      loading={loading}
      data={data}
      error={error}
      onRetry={() => setRetryKey((k) => k + 1)}
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
  const [tick, setTick] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});

  useEffect(() => {
    initIframeResizer();
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
        vars: Object.fromEntries(
          Object.entries(varValues).map(([k, v]) => [k, Array.isArray(v) ? v.map(String).join(',') : String(v)]),
        ),
      },
      hadKeyInUrl,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeState, refresh, mode, varValues]);

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
          <ErrorState {...toErrorProps(dash.error, dash.reload)} />
        </Tokens>
      </ColorModeProvider>
    );
  }

  const dd = dash.dashboard.data;
  const widgets = (dd.widgets ?? []).filter((w) => String(w.panelTypes) !== 'row' && w.id);
  const layoutById = new Map((dd.layout ?? []).map((l) => [l.i, l]));
  const variables = varsDef;

  const onFullscreen = (): void => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <ColorModeProvider mode={mode}>
      <Tokens>
    <div style={{ minHeight: '100vh', background: mode === 'dark' ? '#141414' : '#f5f5f5' }}>
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
        onFullscreen={onFullscreen}
      />
      <div style={{ padding: 12 }}>
        {widgets.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该看板暂无 panel" />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {widgets.map((w) => {
              const l = layoutById.get(w.id);
              const spanPct = l ? Math.max(25, Math.min(100, (l.w / 12) * 100)) : 100;
              const hPx = l ? Math.max(300, l.h * 34) : 320;
              return (
                <div key={w.id} style={{ width: `calc(${spanPct}% - 6px)`, minWidth: 320, flexGrow: 1 }} title={widgetTitle(w)}>
                  <div style={{ height: hPx }}>
                    <WidgetSlot
                      theme={theme}
                      widget={w}
                      startMs={startMs}
                      endMs={endMs}
                      variables={varValues}
                      refreshKey={tick}
                      ready={varsReady}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
      </Tokens>
    </ColorModeProvider>
  );
}
