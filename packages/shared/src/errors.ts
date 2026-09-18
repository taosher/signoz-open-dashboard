/**
 * 嵌入错误码：前后端共用。
 * 约定：httpStatus 供 NestJS 抛 HttpException，code 供前端空态映射。
 */
export const EMBED_ERROR_CODES = {
  MISSING_API_KEY: 'EMBED_MISSING_API_KEY',
  INVALID_API_KEY: 'EMBED_INVALID_API_KEY',
  DASHBOARD_NOT_FOUND: 'EMBED_DASHBOARD_NOT_FOUND',
  UPSTREAM_UNAVAILABLE: 'EMBED_UPSTREAM_UNAVAILABLE',
  READONLY: 'EMBED_READONLY',
  BLOCKED: 'EMBED_BLOCKED',
  BAD_REQUEST: 'EMBED_BAD_REQUEST',
} as const;

export type EmbedErrorCode =
  (typeof EMBED_ERROR_CODES)[keyof typeof EMBED_ERROR_CODES];

export interface EmbedErrorBody {
  code: EmbedErrorCode;
  message: string;
  requestId: string;
  upstreamStatus?: number;
  path?: string;
}
