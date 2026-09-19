/**
 * 嵌入启动（设计文档 §7）：解析 `/embed/:id` 与 URL 参数 → 原生参数归一
 * → replaceState → 主题 registry 选择 → core App 挂载。
 * Key 只放内存（EmbedAuthProvider），不写 localStorage/cookie。
 */
import { isValidDashboardId, parseEmbedParams } from '@signoz-open-dashboard/shared';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { EmbedApp } from './core/App';
import { EmbedAuthProvider } from './core/auth';
import { errorTitle } from './core/errors';
import { syncUrl } from './core/replaceState';
import { resolveTheme } from './themes/registry';
import { legacyTheme } from './themes/legacy';

function boot(): void {
  const rootEl = document.getElementById('embed-root');
  if (!rootEl) return;
  const m = window.location.pathname.match(/\/embed\/([^/]+)/);
  const dashboardId = m ? decodeURIComponent(m[1]) : '';
  const rawSearch = window.location.search;
  const keepKey = new URLSearchParams(rawSearch).has('apiKey') || new URLSearchParams(rawSearch).has('api_key');

  const renderFatal = (title: string, sub: string): void => {
    const Err = legacyTheme.ErrorState;
    createRoot(rootEl).render(
      <React.StrictMode>
        <legacyTheme.TokensProvider>
          <Err code="EMBED_DASHBOARD_NOT_FOUND" message={`${title}：${sub}`} retry={false} />
        </legacyTheme.TokensProvider>
      </React.StrictMode>,
    );
    void errorTitle;
  };

  if (!isValidDashboardId(dashboardId)) {
    renderFatal('Dashboard 不存在或已被删除', '非法 dashboardId，直接 404，不打 Upstream');
    return;
  }

  const params = parseEmbedParams(dashboardId, rawSearch);
  // 入口一次性翻译为原生参数并 replaceState（含 apiKey 回写规则：入参自带才保留）
  syncUrl(window.location.pathname, params, keepKey);

  if (params.fullscreen) {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const theme = resolveTheme(params.theme);
  createRoot(rootEl).render(
    <React.StrictMode>
      <EmbedAuthProvider dashboardId={dashboardId} initialKey={params.apiKey}>
        <EmbedApp theme={theme} params={params} pathname={window.location.pathname} hadKeyInUrl={keepKey} />
      </EmbedAuthProvider>
    </React.StrictMode>,
  );
}

try {
  boot();
} catch (err) {
  const el = document.getElementById('embed-root');
  if (el) {
    el.innerHTML = `<pre style="padding:24px">BOOT FAILED: ${String((err as Error)?.stack || err).slice(0, 2000)}</pre>`;
  }
  throw err;
}
