/**
 * In-memory auth (design doc §7.4-1). Key lives only in memory, never in localStorage/cookie.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface EmbedAuth {
  dashboardId: string;
  /** In-memory Key: `URL.apiKey`, undefined when absent (server falls back to the env default). */
  apiKey: string | undefined;
  /** Whether a Key is present (used to distinguish 401 empty-state copy). */
  hasKey: boolean;
  setApiKey: (key: string | undefined) => void;
}

const Ctx = createContext<EmbedAuth | null>(null);

export function EmbedAuthProvider(props: {
  dashboardId: string;
  initialKey?: string;
  children: ReactNode;
}): JSX.Element {
  const [apiKey, setKey] = useState<string | undefined>(() => {
    const k = (props.initialKey ?? '').trim();
    return k === '' ? undefined : k;
  });
  const value = useMemo<EmbedAuth>(
    () => ({
      dashboardId: props.dashboardId,
      apiKey,
      hasKey: apiKey !== undefined,
      setApiKey: (key) => {
        const k = (key ?? '').trim();
        setKey(k === '' ? undefined : k);
      },
    }),
    [props.dashboardId, apiKey],
  );
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useEmbedAuth(): EmbedAuth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEmbedAuth must be used within EmbedAuthProvider');
  return v;
}
