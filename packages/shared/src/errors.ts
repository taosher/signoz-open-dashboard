/**
 * Embed error codes: shared by frontend and backend.
 * Convention: httpStatus is for NestJS HttpException, code is for frontend empty-state mapping.
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
