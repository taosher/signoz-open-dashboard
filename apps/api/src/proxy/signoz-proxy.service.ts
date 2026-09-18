import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 上游错误归一（设计文档 §6.3）。query_range 的业务错误透传原 body，仅认证类映射。 */
export function mapUpstreamError(
  upstreamPath: string,
  upstreamStatus: number,
  requestId: string,
): HttpException | null {
  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return new HttpException(
      {
        code: 'EMBED_INVALID_API_KEY',
        message: 'API Key 无效或无查看权限',
        requestId,
        upstreamStatus,
        path: upstreamPath,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
  if (
    upstreamStatus === 404 &&
    upstreamPath.startsWith('/api/v1/dashboards/')
  ) {
    return new HttpException(
      {
        code: 'EMBED_DASHBOARD_NOT_FOUND',
        message: 'Dashboard 不存在或已被删除',
        requestId,
        upstreamStatus,
        path: upstreamPath,
      },
      HttpStatus.NOT_FOUND,
    );
  }
  return null;
}

@Injectable()
export class SignozProxyService {
  private readonly logger = new Logger(SignozProxyService.name);

  constructor(private readonly config: ConfigService) {}

  get baseUrl(): string {
    return this.config.get<string>('signoz.baseUrl') ?? '';
  }

  get upstreamTimeoutMs(): number {
    return this.config.get<number>('signoz.upstreamTimeoutMs') ?? 30000;
  }

  get metaTimeoutMs(): number {
    return this.config.get<number>('signoz.metaTimeoutMs') ?? 10000;
  }

  /** 透传请求到 Upstream，返回 { status, headers, body }。调用方负责写回 Response。 */
  async forward(opts: {
    upstreamPath: string;
    queryString: string;
    method: string;
    headers: Record<string, string | undefined>;
    body?: Buffer;
    effectiveKey: string;
    timeoutMs?: number;
  }): Promise<{ status: number; contentType?: string; body: Buffer }> {
    const url = `${this.baseUrl}${opts.upstreamPath}${opts.queryString ? `?${opts.queryString}` : ''}`;
    const ctrl = new AbortController();
    const timer = setTimeout(
      () => ctrl.abort(),
      opts.timeoutMs ?? this.upstreamTimeoutMs,
    );
    try {
      const headers: Record<string, string> = {};
      if (opts.headers['content-type']) {
        headers['content-type'] = opts.headers['content-type'];
      }
      if (opts.headers['accept']) {
        headers['accept'] = opts.headers['accept'];
      }
      headers['SIGNOZ-API-KEY'] = opts.effectiveKey;

      const res = await fetch(url, {
        method: opts.method,
        headers,
        body: ['GET', 'HEAD'].includes(opts.method.toUpperCase())
          ? undefined
          : opts.body,
        signal: ctrl.signal,
      });
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        status: res.status,
        contentType: res.headers.get('content-type') ?? undefined,
        body: buf,
      };
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw new HttpException(
          {
            code: 'EMBED_UPSTREAM_UNAVAILABLE',
            message: 'SigNoz 后端超时',
            path: opts.upstreamPath,
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      this.logger.warn(`forward failed: ${(err as Error)?.message}`);
      throw new HttpException(
        {
          code: 'EMBED_UPSTREAM_UNAVAILABLE',
          message: 'SigNoz 后端不可达',
          path: opts.upstreamPath,
        },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
