/**
 * replaceState write-back (design doc §4.1): native params + `var-*`,
 * keep the key only when it was present in the input; never append the env-default key.
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
