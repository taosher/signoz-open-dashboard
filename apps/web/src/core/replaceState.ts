/**
 * replaceState 回写（设计文档 §4.1）：原生参数 + `var-*`，
 * 入参自带 key 才保留，否则不追加 env 默认 key。
 */
import type { ParsedEmbedParams } from '@signoz-open-dashboard/shared';
import { serializeEmbedParams } from '@signoz-open-dashboard/shared';

export function syncUrl(
  pathname: string,
  params: ParsedEmbedParams,
  hadKeyInUrl: boolean,
): void {
  const qs = serializeEmbedParams(params, { includeApiKey: hadKeyInUrl });
  window.history.replaceState(null, '', qs === '' ? pathname : `${pathname}?${qs}`);
}
