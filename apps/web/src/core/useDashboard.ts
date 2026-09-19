/**
 * Dashboard first-screen fetch (design doc §6.2: `GET /api/v1/dashboards/:id` passthrough).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';
import { useEmbedAuth } from './auth';
import { unwrapDashboard, type DashboardPayload } from './dashboard';

export interface DashboardState {
  loading: boolean;
  dashboard: DashboardPayload | null;
  error: unknown;
  reload: () => void;
}

export function useDashboard(): DashboardState {
  const { dashboardId, apiKey } = useEmbedAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    apiFetch<unknown>(`/api/v1/dashboards/${encodeURIComponent(dashboardId)}`, {
      signal: ctrl.signal,
      apiKey,
    })
      .then((json) => {
        const d = unwrapDashboard(json);
        if (!d) throw Object.assign(new Error('Malformed dashboard payload'), { code: 'EMBED_UPSTREAM_UNAVAILABLE', httpStatus: 502 });
        if (d.id === '') d.id = dashboardId;
        setDashboard(d);
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        setDashboard(null);
        setError(e);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [dashboardId, apiKey, nonce]);

  return { loading, dashboard, error, reload };
}
