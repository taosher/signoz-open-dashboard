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
 * Redacted access-log interceptor (design doc §6.3).
 * Logs: method, upstream path (query redacted), dashboardId, upstreamStatus, duration,
 * effectiveKeySource/Hash8, UA, referer. Never log the plaintext key.
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
    // Upstream path: strip the /api/signoz prefix for proxied requests, keep the rest (healthz/metrics) as-is
    const upstreamPath = path.startsWith('/api/signoz')
      ? path.slice('/api/signoz'.length) || '/'
      : path;
    const dashboardId = extractDashboardId(upstreamPath);
    const source =
      (meta.__embedKeySource as string | undefined) ?? 'unknown';
    const keyHash =
      (meta.__embedKeyHash as string | undefined) ??
      (source === 'none' ? 'none' : 'unknown');
    // A hash can only prove existence from the source, never recover the plaintext; logging the source here is enough,
    // the proxy layer computes the hash separately when debugging and omits it by default to avoid misuse.
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
        // sha256 first-8 fingerprint (not plaintext) for troubleshooting comparison; 'none' when there is no key
        effectiveKeyHash: keyHash,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        _hashNote:
          'To troubleshoot, compute the sha256 first-8 locally from the operator-held plaintext key; logs store no hash',
      }),
    );
    void hashKeyPrefix8;
  }
}
