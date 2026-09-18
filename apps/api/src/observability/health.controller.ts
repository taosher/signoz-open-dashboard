import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * 健康检查（设计文档 §6.3）。
 * /healthz 永不因 Upstream 不可达而 500，只标记 degraded + signozReachable=false。
 */
@SkipThrottle()
@Controller('healthz')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly config: ConfigService) {}

  @Get()
  async check(): Promise<{
    status: 'ok';
    signozReachable: boolean;
    signozVersion: string;
    uptime: number;
  }> {
    const baseUrl: string =
      this.config.get<string>('signoz.baseUrl') ?? '';
    const timeoutMs: number =
      this.config.get<number>('signoz.metaTimeoutMs') ?? 10000;
    let signozReachable = false;
    let signozVersion = 'unknown';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(`${baseUrl}/api/v1/version`, {
          signal: ctrl.signal,
        });
        signozReachable = res.ok;
        if (res.ok) {
          const text = await res.text();
          // version 接口返回纯文本或 JSON，截断存证即可
          signozVersion = text.slice(0, 64);
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      signozReachable = false;
    }
    return {
      status: 'ok',
      signozReachable,
      signozVersion,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
