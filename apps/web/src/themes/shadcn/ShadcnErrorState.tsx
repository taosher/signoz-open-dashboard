/** Shadcn empty state + Retry + requestId. */
import type { ErrorProps } from '../../core/errors';
import { SchnButton } from './ui';

const TITLE_ZH: Record<string, string> = {
  EMBED_MISSING_API_KEY: '缺少 API Key',
  EMBED_INVALID_API_KEY: 'API Key 无效或无查看权限',
  EMBED_DASHBOARD_NOT_FOUND: 'Dashboard 不存在或已被删除',
  EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz 后端不可达/超时',
  EMBED_READONLY: '嵌入页为只读，该操作不可用',
  EMBED_BLOCKED: '该接口未开放透传',
  EMBED_BAD_REQUEST: '请求参数有误',
};

const TITLE_EN: Record<string, string> = {
  EMBED_MISSING_API_KEY: 'Missing API Key',
  EMBED_INVALID_API_KEY: 'Invalid API key or insufficient permission',
  EMBED_DASHBOARD_NOT_FOUND: 'Dashboard not found or deleted',
  EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz backend unreachable',
  EMBED_READONLY: 'Embed is read-only',
  EMBED_BLOCKED: 'Endpoint not proxied',
  EMBED_BAD_REQUEST: 'Bad request',
};

export function ShadcnErrorState(props: ErrorProps): JSX.Element {
  const table = props.locale === 'en' ? TITLE_EN : TITLE_ZH;
  return (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {table[props.code] ?? props.code}
      </div>
      <div className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">{props.message}</div>
      {props.requestId ? <div className="text-[11px] text-zinc-400">requestId: {props.requestId}</div> : null}
      <div className="text-[11px] text-zinc-400">{props.code}</div>
      {props.retry && props.onRetry ? (
        <SchnButton variant="default" onClick={props.onRetry}>
          {props.locale === 'en' ? 'Retry' : '重试'}
        </SchnButton>
      ) : null}
    </div>
  );
}
