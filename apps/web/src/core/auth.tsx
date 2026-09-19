/**
 * 内存鉴权（设计文档 §7.4-1）。Key 只放内存，不写 localStorage/cookie。
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface EmbedAuth {
  dashboardId: string;
  /** 内存 Key：`URL.apiKey`，无则 undefined（服务端回退 env 默认值）。 */
  apiKey: string | undefined;
  /** 是否携带了 Key（用于 401 空态文案区分）。 */
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
  if (!v) throw new Error('useEmbedAuth 必须在 EmbedAuthProvider 内使用');
  return v;
}
