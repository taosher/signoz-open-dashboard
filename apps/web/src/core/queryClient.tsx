/**
 * TanStack Query v5 wiring (M7). All embed fetching goes through React Query:
 * same-key concurrent dedup, placeholder keeps stale charts (SWR-style flicker-free updates), exponential-backoff retries.
 * iframe has no focus semantics: disable window-focus/reconnect refetch.
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

/** Stable hash (sorted keys, for queryKey use). */
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
