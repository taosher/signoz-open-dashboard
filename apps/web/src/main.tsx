/**
 * 嵌入启动（EMBED-P3，见 third_party/PATCHES.md）。
 * 职责：解析 /embed/:id 与 URL 参数 → 归一化为原生参数 → 预置 localStorage
 * （主题/UTC）→ 装配原生 Provider 链 → MemoryRouter 挂载原生看板页。
 */
import {
  isValidDashboardId,
  parseEmbedParams,
} from '@signoz-open-dashboard/shared';
import { ConfigProvider } from 'antd';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { ThemeProvider, useThemeConfig } from 'hooks/useDarkMode';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import TimezoneProvider from 'providers/Timezone';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { setEmbedApiKey } from './embed/keyStore';
import DashboardPage from './embed/DashboardPage';

import 'uplot/dist/uPlot.min.css';
import './vendor/styles.scss';
import './embed/boot.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function toNativeTimeSearch(from: string, to: string): string {
  const q = new URLSearchParams();
  const rel = (v: string): string | null => {
    const m = /^now(?:-(\d+[smhdw]))?$/.exec(v.trim());
    return m ? m[1] ?? '' : null;
  };
  const rf = rel(from);
  const rt = rel(to);
  if (rf !== null && rt !== null && (rf !== '' || rt !== '')) {
    // now-6h~now → relativeTime=6h；纯 now~now 视为 6h 默认
    q.set(QueryParams.relativeTime, rf === '' ? '6h' : rf);
  } else {
    const num = (v: string): string => {
      if (/^\d+$/.test(v.trim())) return v.trim();
      const t = Date.parse(v);
      return Number.isNaN(t) ? '' : String(Math.floor(t / 1000));
    };
    const s = num(from);
    const e = num(to);
    if (s) q.set('startTime', s);
    if (e) q.set('endTime', e);
  }
  return q.toString();
}

function boot(): void {
  const m = window.location.pathname.match(/\/embed\/([^/]+)/);
  const dashboardId = m ? decodeURIComponent(m[1]) : '';
  const params = parseEmbedParams(dashboardId, window.location.search);

  if (!isValidDashboardId(dashboardId)) {
    document.getElementById('embed-root')!.innerHTML =
      '<div style="padding:48px;text-align:center;font-family:Inter,sans-serif">Invalid dashboard id</div>';
    return;
  }

  // 内存 key（P1 拦截器经 keyStore 取用）
  setEmbedApiKey(params.apiKey);

  // 主题/时区预置（原生从 localStorage 读取，零补丁复用）
  try {
    window.localStorage.setItem(
      LOCALSTORAGE.THEME,
      params.theme === 'dark' ? 'dark' : 'light',
    );
    window.localStorage.setItem(LOCALSTORAGE.THEME_AUTO_SWITCH, 'false');
    window.localStorage.setItem(LOCALSTORAGE.PREFERRED_TIMEZONE, 'UTC');
  } catch {
    // 隐私模式忽略
  }

  // 时间归一化为原生参数
  const timeQs = toNativeTimeSearch(params.from, params.to);

  // 浏览器地址栏保持嵌入形态（含 apiKey 回写规则：入参自带才保留）
  const keep = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  if (params.apiKey) out.set('apiKey', params.apiKey);
  out.set('from', params.from);
  out.set('to', params.to);
  out.set('theme', params.theme);
  out.set('locale', params.locale);
  if (params.refresh !== 'inherit') out.set('refresh', params.refresh);
  for (const [k, v] of keep.entries()) {
    if (k.startsWith('var-')) out.set(k, v);
  }
  void timeQs;
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}?${out.toString()}`,
  );

  // 语言
  const applyLocale = async (): Promise<void> => {
    try {
      const { default: i18n } = await import('ReactI18');
      await i18n.changeLanguage(params.locale === 'en' ? 'en' : 'zh');
    } catch {
      // 语言失败不阻塞渲染
    }
  };
  void applyLocale();

  if (params.fullscreen) {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }
  void import('@iframe-resizer/child').catch(() => undefined);

  const routerSearch = `?${timeQs}`;

  function Themed(): JSX.Element {
    const themeConfig = useThemeConfig();
    return (
      <ConfigProvider theme={themeConfig}>
        <MemoryRouter
          initialEntries={[
            `${ROUTES.DASHBOARD.replace(':dashboardId', dashboardId)}${routerSearch}`,
          ]}
        >
          <DashboardProvider>
            <DashboardPage />
          </DashboardProvider>
        </MemoryRouter>
      </ConfigProvider>
    );
  }

  createRoot(document.getElementById('embed-root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <TimezoneProvider>
          <QueryClientProvider client={queryClient}>
            <ReduxProvider store={store}>
              <ErrorModalProvider>
                <Themed />
              </ErrorModalProvider>
            </ReduxProvider>
          </QueryClientProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}

boot();
