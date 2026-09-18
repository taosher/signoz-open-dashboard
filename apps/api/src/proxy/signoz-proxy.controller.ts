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
 * 全量透传控制器（设计文档 §6.2）。
 * 路由：ALL /api/signoz/* → stripPrefix → SIGNOZ_BASE_URL + path。
 * 前端禁止直连 Upstream，一律走同源 /api/signoz。
 */
@Controller('api/signoz')
export class SignozProxyController {
  constructor(
    private readonly proxy: SignozProxyService,
    private readonly config: ConfigService,
  ) {}

  @All('*')
  async proxyAll(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Express 在 Controller('api/signoz') + @All('*') 下，req.path 为全路径
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
    // requestId 透传给日志拦截器
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
              ? '嵌入页为只读，该写操作不可用'
              : '该接口未在嵌入白名单内',
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
    // 供日志拦截器使用（只记 source + hash8，不记明文）
    (req as unknown as Record<string, unknown>).__embedKeySource = source;
    (req as unknown as Record<string, unknown>).__embedKeyHash =
      hashKeyPrefix8(effectiveKey);

    if (!effectiveKey) {
      throw new HttpException(
        {
          code: 'EMBED_MISSING_API_KEY',
          message: '缺少 API Key：URL 加 ?apiKey= 或配置服务端 SIGNOZ_API_KEY',
          requestId,
          path: upstreamPath.split('?')[0],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 注意：Express/Nest 默认 json bodyParser 已消费请求流，
    // 此处不可再监听 req 'data'/'end'（会永久挂起），直接用已解析的 req.body。
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

    // 认证类错误归一；其余原样透传（含 query_range 业务错误体）
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
