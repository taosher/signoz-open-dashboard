/**
 * TanStack Query v5 接入（M7）。嵌入页取数统一走 React Query：
 * 同 key 并发去重、placeholder 保旧数据（SWR 式无闪更新）、指数退避重试。
 * iframe 无焦点语义：关闭 window-focus/reconnect 自动取数。
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export const embedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  },
});

export function EmbedQueryProvider({ children }: { children: ReactNode }): JSX.Element {
  return <QueryClientProvider client={embedQueryClient}>{children}</QueryClientProvider>;
}

/** 稳定哈希（键排序，queryKey 用）。 */
export function stableHash(v: unknown): string {
  return JSON.stringify(sortDeep(v));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}
