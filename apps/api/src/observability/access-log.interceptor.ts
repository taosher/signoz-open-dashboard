import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import {
  extractDashboardId,
  hashKeyPrefix8,
  sanitizeQuery,
} from '../proxy/proxy.util';
import { MetricsService } from './metrics.service';

/**
 * 脱敏访问日志拦截器（设计文档 §6.3）。
 * 记录：method、上游 path（query 脱敏）、dashboardId、upstreamStatus、耗时、
 * effectiveKeySource/Hash8、UA、referer。永不记明文 Key。
 */
@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('access');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();
    const method = req.method;
    const rawUrl = req.originalUrl ?? req.url;

    return next.handle().pipe(
      tap({
        next: () => this.log(req, method, rawUrl, start),
        error: (err) => this.log(req, method, rawUrl, start, err),
      }),
    );
  }

  private log(
    req: Request,
    method: string,
    rawUrl: string,
    start: number,
    err?: unknown,
  ): void {
    const durationMs = Date.now() - start;
    const [path, qs] = rawUrl.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs ?? ''));
    const sanitized = sanitizeQuery(query);
    const meta = req as unknown as Record<string, unknown>;
    const upstreamStatus =
      (meta.__embedUpstreamStatus as number | undefined) ??
      (err as { status?: number })?.status;
    // 上游 path：代理请求剥离 /api/signoz 前缀，其余（healthz/metrics）原样
    const upstreamPath = path.startsWith('/api/signoz')
      ? path.slice('/api/signoz'.length) || '/'
      : path;
    const dashboardId = extractDashboardId(upstreamPath);
    const source =
      (meta.__embedKeySource as string | undefined) ?? 'unknown';
    const keyHash =
      (meta.__embedKeyHash as string | undefined) ??
      (source === 'none' ? 'none' : 'unknown');
    // hash 只能从 source 推断存在性，不反查明文；此处记 source 即可，
    // hash 由代理层在 debug 时另行计算，默认不输出以避免误用。
    const requestId =
      (meta.__embedRequestId as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);

    this.metrics.observeHttp(
      path.startsWith('/api/signoz') ? 'proxy' : path,
      upstreamStatus ?? 200,
      durationMs,
    );

    this.logger.log(
      JSON.stringify({
        requestId,
        method,
        path: upstreamPath,
        query: sanitized,
        dashboardId,
        upstreamStatus,
        durationMs,
        effectiveKeySource: source,
        // sha256 前8位指纹（非明文），供排障比对；无 key 时为 none
        effectiveKeyHash: keyHash,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        _hashNote:
          '如需排障，用运维手中的明文 key 本地算 sha256 前8位比对，日志不存 hash',
      }),
    );
    void hashKeyPrefix8;
  }
}
