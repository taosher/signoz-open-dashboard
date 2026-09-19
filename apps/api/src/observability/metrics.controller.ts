import { Controller, Get, Header, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { MetricsService } from './metrics.service';

/** Prometheus metrics (design doc §6.3). See AppModule for the global rate-limit bypass. */
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
