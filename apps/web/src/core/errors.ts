/**
 * 错误映射（设计文档 §6.4 / §7.4-8）。core 按 code 映射，主题只负责样式表达。
 */
import type { EmbedErrorCode, EmbedLocale } from '@signoz-open-dashboard/shared';
import type { EmbedApiError } from './api';

export interface ErrorProps {
  code: EmbedErrorCode;
  message: string;
  requestId?: string;
  retry: boolean;
  onRetry?: () => void;
  locale?: EmbedLocale;
}

const RETRYABLE: ReadonlySet<EmbedErrorCode> = new Set([
  'EMBED_INVALID_API_KEY',
  'EMBED_UPSTREAM_UNAVAILABLE',
]);

export function toErrorProps(e: unknown, onRetry?: () => void, locale: EmbedLocale = 'zh'): ErrorProps {
  const err = e as Partial<EmbedApiError>;
  const code: EmbedErrorCode =
    typeof err.code === 'string' ? (err.code as EmbedErrorCode) : 'EMBED_UPSTREAM_UNAVAILABLE';
  const message =
    typeof err.message === 'string' && err.message !== '' ? err.message : '加载失败';
  return { code, message, requestId: err.requestId, retry: RETRYABLE.has(code), onRetry, locale };
}

const TITLE_ZH: Record<EmbedErrorCode, string> = {
  EMBED_MISSING_API_KEY: '缺少 API Key',
  EMBED_INVALID_API_KEY: 'API Key 无效或无查看权限',
  EMBED_DASHBOARD_NOT_FOUND: 'Dashboard 不存在或已被删除',
  EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz 后端不可达/超时',
  EMBED_READONLY: '嵌入页为只读，该操作不可用',
  EMBED_BLOCKED: '该接口未开放透传',
  EMBED_BAD_REQUEST: '请求参数有误',
};

const TITLE_EN: Record<EmbedErrorCode, string> = {
  EMBED_MISSING_API_KEY: 'Missing API Key',
  EMBED_INVALID_API_KEY: 'Invalid API key or insufficient permission',
  EMBED_DASHBOARD_NOT_FOUND: 'Dashboard not found or deleted',
  EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz backend unreachable',
  EMBED_READONLY: 'Embed is read-only',
  EMBED_BLOCKED: 'Endpoint not proxied',
  EMBED_BAD_REQUEST: 'Bad request',
};

export function errorTitle(code: EmbedErrorCode, locale: EmbedLocale = 'zh'): string {
  const table = locale === 'en' ? TITLE_EN : TITLE_ZH;
  return table[code] ?? '加载失败';
}
