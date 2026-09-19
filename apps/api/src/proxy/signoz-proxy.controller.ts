import {
  All,
  Controller,
  HttpException,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { decideProxy } from './proxy.allowlist';
import { mapUpstreamError, SignozProxyService } from './signoz-proxy.service';
import {
  ensureRequestId,
  hashKeyPrefix8,
  resolveEffectiveKey,
} from './proxy.util';

/**
 * Full pass-through controller (design doc §6.2).
 * Route: ALL /api/signoz/* → stripPrefix → SIGNOZ_BASE_URL + path.
 * The frontend must never call the upstream directly; always use same-origin /api/signoz.
 */
@Controller('api/signoz')
export class SignozProxyController {
  constructor(
    private readonly proxy: SignozProxyService,
    private readonly config: ConfigService,
  ) {}

  @All('*')
  async proxyAll(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Under Express with Controller('api/signoz') + @All('*'), req.path holds the full path
    const fullPath: string = (req as unknown as { path: string }).path ?? req.url;
    const prefix = '/api/signoz';
    const upstreamPath = fullPath.startsWith(prefix)
      ? fullPath.slice(prefix.length) || '/'
      : fullPath;
    const queryString = req.originalUrl.includes('?')
      ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1)
      : '';

    const requestId = ensureRequestId(
      (req.headers['x-request-id'] as string) ?? '',
    );
    res.setHeader('x-embed-request-id', requestId);
    // Propagate requestId to the logging interceptor
    (req as unknown as Record<string, unknown>).__embedRequestId = requestId;

    const decision = decideProxy(req.method, upstreamPath.split('?')[0]);
    if (!decision.allowed) {
      const status =
        decision.code === 'EMBED_READONLY'
          ? HttpStatus.FORBIDDEN
          : HttpStatus.FORBIDDEN;
      throw new HttpException(
        {
          code: decision.code,
          message:
            decision.code === 'EMBED_READONLY'
              ? 'Embed page is read-only, this write operation is unavailable'
              : 'This endpoint is not in the embed allowlist',
          requestId,
          path: upstreamPath.split('?')[0],
        },
        status,
      );
    }

    const headerKey = req.headers['x-embed-api-key'] as string | undefined;
    const q = req.query as Record<string, unknown>;
    const queryKey =
      (q['apiKey'] as string | undefined) ??
      (q['api_key'] as string | undefined);
    const envKey = this.config.get<string>('signoz.apiKey') ?? '';
    const { key: effectiveKey, source } = resolveEffectiveKey({
      headerKey,
      queryKey,
      envKey,
    });
    // For the logging interceptor (log source + hash8 only, never the plaintext key)
    (req as unknown as Record<string, unknown>).__embedKeySource = source;
    (req as unknown as Record<string, unknown>).__embedKeyHash =
      hashKeyPrefix8(effectiveKey);

    if (!effectiveKey) {
      throw new HttpException(
        {
          code: 'EMBED_MISSING_API_KEY',
          message: 'Missing API Key: append ?apiKey= to the URL or set server-side SIGNOZ_API_KEY',
          requestId,
          path: upstreamPath.split('?')[0],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Note: the default Express/Nest JSON bodyParser has already consumed the request stream,
    // so do not listen for req 'data'/'end' here (it would hang forever); use the parsed req.body directly.
    const parsedBody: unknown = (req as unknown as { body?: unknown }).body;
    let body: Buffer | undefined;
    if (
      parsedBody !== undefined &&
      parsedBody !== null &&
      !(typeof parsedBody === 'object' && Object.keys(parsedBody).length === 0)
    ) {
      body =
        Buffer.isBuffer(parsedBody) || typeof parsedBody === 'string'
          ? Buffer.from(parsedBody as string)
          : Buffer.from(JSON.stringify(parsedBody));
    }

    const upstream = await this.proxy.forward({
      upstreamPath: upstreamPath.split('?')[0],
      queryString,
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] as string | undefined,
        accept: req.headers['accept'] as string | undefined,
      },
      body,
      effectiveKey,
    });

    // Normalize auth errors; pass everything else through untouched (including query_range business error bodies)
    const mapped = mapUpstreamError(
      upstreamPath.split('?')[0],
      upstream.status,
      requestId,
    );
    (req as unknown as Record<string, unknown>).__embedUpstreamStatus =
      upstream.status;

    if (mapped) {
      const resp = mapped.getResponse() as Record<string, unknown>;
      res.status(mapped.getStatus()).json({ ...resp, requestId });
      return;
    }

    if (upstream.contentType) {
      res.setHeader('content-type', upstream.contentType);
    }
    res.status(upstream.status).send(upstream.body);
  }
}
