import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly httpTotal: Counter<string>;
  private readonly upstreamDuration: Histogram<string>;
  private readonly upstreamErrors: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpTotal = new Counter({
      name: 'embed_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['route', 'status'],
      registers: [this.registry],
    });
    this.upstreamDuration = new Histogram({
      name: 'embed_proxy_upstream_duration_seconds',
      help: 'Upstream request duration',
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });
    this.upstreamErrors = new Counter({
      name: 'embed_proxy_upstream_errors_total',
      help: 'Upstream errors by reason',
      labelNames: ['reason'],
      registers: [this.registry],
    });
  }

  observeHttp(route: string, status: number, durationMs: number): void {
    this.httpTotal.inc({ route, status: String(status) });
    if (route === 'proxy') {
      this.upstreamDuration.observe(durationMs / 1000);
      if (status >= 500) {
        this.upstreamErrors.inc({ reason: `http_${status}` });
      }
    }
  }

  incUpstreamError(reason: string): void {
    this.upstreamErrors.inc({ reason });
  }

  async exposition(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
