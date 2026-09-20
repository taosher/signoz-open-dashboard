/**
 * Embed bootstrap (design doc §7): parse `/embed/:id` and URL params → normalize to
 * native params → replaceState → pick theme from registry → mount core App.
 * Key lives only in memory (EmbedAuthProvider), never in localStorage/cookie.
 */
import './core/reset.css';
import { isValidDashboardId, parseEmbedParams } from '@signoz-open-dashboard/shared';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { EmbedApp } from './core/App';
import { EmbedAuthProvider } from './core/auth';
import { EmbedQueryProvider } from './core/queryClient';
import { errorTitle } from './core/errors';
import { syncUrl } from './core/replaceState';
import { resolveTheme } from './themes/registry';
import { shadcnTheme } from './themes/shadcn';

function boot(): void {
  const rootEl = document.getElementById('embed-root');
  if (!rootEl) return;
  const m = window.location.pathname.match(/\/embed\/([^/]+)/);
  const dashboardId = m ? decodeURIComponent(m[1]) : '';
  const rawSearch = window.location.search;
  const keepKey = new URLSearchParams(rawSearch).has('apiKey') || new URLSearchParams(rawSearch).has('api_key');

  const renderFatal = (title: string, sub: string): void => {
    const locale = new URLSearchParams(rawSearch).get('locale') === 'en' ? 'en' : 'zh';
    const Err = shadcnTheme.ErrorState;
    createRoot(rootEl).render(
      <React.StrictMode>
        <shadcnTheme.TokensProvider>
          <Err code="EMBED_DASHBOARD_NOT_FOUND" message={`${title}：${sub}`} retry={false} locale={locale} />
        </shadcnTheme.TokensProvider>
      </React.StrictMode>,
    );
    void errorTitle;
  };

  if (!isValidDashboardId(dashboardId)) {
    if (new URLSearchParams(rawSearch).get('locale') === 'en') {
      renderFatal('Dashboard not found or deleted', 'Invalid dashboard id, upstream not called');
    } else {
      renderFatal('Dashboard 不存在或已被删除', '非法 dashboardId，直接 404，不打 Upstream');
    }
    return;
  }

  const params = parseEmbedParams(dashboardId, rawSearch);
  // Translate entry params to native params once and replaceState (apiKey write-back rule: keep only if present in input)
  syncUrl(window.location.pathname, params, keepKey);

  if (params.fullscreen) {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const theme = resolveTheme(params.theme);
  createRoot(rootEl).render(
    <React.StrictMode>
      <EmbedQueryProvider>
        <EmbedAuthProvider dashboardId={dashboardId} initialKey={params.apiKey}>
          <EmbedApp theme={theme} params={params} pathname={window.location.pathname} hadKeyInUrl={keepKey} />
        </EmbedAuthProvider>
      </EmbedQueryProvider>
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
