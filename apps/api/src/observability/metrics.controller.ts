import { Controller, Get, Header, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { MetricsService } from './metrics.service';

/** Prometheus 指标（设计文档 §6.3）。跳过全局限流见 AppModule。 */
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('content-type', 'text/plain; version=0.0.4')
  async exposition(@Req() req: Request): Promise<string> {
    void req;
    void this.config;
    return this.metrics.exposition();
  }
}
