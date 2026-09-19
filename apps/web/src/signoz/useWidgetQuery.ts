/**
 * 单 widget v5 取数（含 AbortSignal 取消 + 可选轮询由调用方驱动）。
 */
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../core/api';
import { useEmbedAuth } from '../core/auth';
import type { EmbedWidget } from '../core/dashboard';
import { buildQueryRangePayload } from './queryPayload';
import { parseV5Response, type ParsedV5 } from './v5Response';

export interface WidgetQueryState {
  loading: boolean;
  data: ParsedV5 | null;
  error: unknown;
}

export function useWidgetQuery(
  widget: EmbedWidget,
  opts: { startMs: number; endMs: number; variables: Record<string, unknown>; refreshKey: number; enabled?: boolean },
): WidgetQueryState {
  const { apiKey } = useEmbedAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ParsedV5 | null>(null);
  const [error, setError] = useState<unknown>(null);
  const varsKey = useRef('');
  const enabled = opts.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      return undefined;
    }
    varsKey.current = JSON.stringify(opts.variables);
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    const { payload, legendMap } = buildQueryRangePayload(widget, {
      startMs: opts.startMs,
      endMs: opts.endMs,
      variables: opts.variables,
    });
    if (!payload) {
      // eslint-disable-next-line no-console
      console.debug(
        `[embed-widget] ${widget.id.slice(0, 8)} skip: empty payload (panel=${String(widget.panelTypes)} qtype=${String(widget.query?.queryType ?? 'none')})`,
      );
      setData(null);
      setLoading(false);
      return () => ctrl.abort();
    }
    apiFetch<unknown>('/api/v5/query_range', {
      method: 'POST',
      body: payload,
      signal: ctrl.signal,
      apiKey,
    })
      .then((json) => {
        setData(parseV5Response(json, legendMap, payload.compositeQuery.queries));
      })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        setData(null);
        setError(e);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id, opts.startMs, opts.endMs, varsKey.current, opts.refreshKey, apiKey, enabled]);

  return { loading, data, error };
}
