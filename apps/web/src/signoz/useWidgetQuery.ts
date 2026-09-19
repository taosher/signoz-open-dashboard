/**
 * 单 widget v5 取数（M7：TanStack Query）。
 * key 变化（时间推进/变量变更/刷新 tick）触发取数，`placeholderData` 保旧图，
 * 后台取数中 `refreshing` 为 true（主题可弱提示，不闪 Spin）。
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../core/api';
import { useEmbedAuth } from '../core/auth';
import type { EmbedWidget } from '../core/dashboard';
import { stableHash } from '../core/queryClient';
import { buildQueryRangePayload } from './queryPayload';
import { parseV5Response, type ParsedV5 } from './v5Response';

export interface WidgetQueryState {
  /** 首屏且无数据时为 true（之后由 placeholder 保旧图，不再闪）。 */
  loading: boolean;
  data: ParsedV5 | null;
  error: unknown;
  /** 有旧数据时的后台取数中。 */
  refreshing: boolean;
  refetch: () => void;
}

export function useWidgetQuery(
  widget: EmbedWidget,
  opts: { startMs: number; endMs: number; variables: Record<string, unknown>; refreshKey: number; enabled?: boolean },
): WidgetQueryState {
  const { dashboardId, apiKey } = useEmbedAuth();
  const enabled = opts.enabled ?? true;
  const varsHash = stableHash(opts.variables);

  const built = buildQueryRangePayload(widget, {
    startMs: opts.startMs,
    endMs: opts.endMs,
    variables: opts.variables,
  });
  const payloadJson = built.payload ? stableHash(built.payload) : null;

  const query = useQuery({
    queryKey: [
      'embed',
      'widget',
      dashboardId,
      widget.id,
      opts.startMs,
      opts.endMs,
      varsHash,
      opts.refreshKey,
      apiKey ? 'key' : 'nokey',
    ],
    queryFn: async ({ signal }): Promise<ParsedV5 | null> => {
      if (!built.payload) {
        // eslint-disable-next-line no-console
        console.debug(
          `[embed-widget] ${widget.id.slice(0, 8)} skip: empty payload (panel=${String(widget.panelTypes)} qtype=${String(widget.query?.queryType ?? 'none')})`,
        );
        return null;
      }
      const json = await apiFetch<unknown>('/api/v5/query_range', {
        method: 'POST',
        body: built.payload,
        signal,
        apiKey,
      });
      return parseV5Response(json, built.legendMap, built.payload.compositeQuery.queries);
    },
    enabled: enabled && payloadJson !== null,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  return {
    loading: query.isLoading && !query.data,
    data: query.data ?? null,
    error: query.isError ? query.error : null,
    refreshing: query.isFetching && query.data !== undefined,
    refetch: () => {
      void query.refetch();
    },
  };
}
