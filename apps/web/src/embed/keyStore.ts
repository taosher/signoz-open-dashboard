/**
 * 内存 Key 存取（设计文档 §7 P3）。只放内存，不写 localStorage/cookie。
 * api 拦截器（apiIndex.ts）经此取 key 写入 x-embed-api-key 头。
 */
let apiKey: string | undefined;

export function setEmbedApiKey(key: string | undefined): void {
  apiKey = key && key.trim() !== '' ? key.trim() : undefined;
}

export function getEmbedApiKey(): string | undefined {
  return apiKey;
}
