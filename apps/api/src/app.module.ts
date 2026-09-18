import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { signozConfig, validationSchema } from './config/signoz.config';
import { AccessLogInterceptor } from './observability/access-log.interceptor';
import { HealthController } from './observability/health.controller';
import { MetricsController } from './observability/metrics.controller';
import { MetricsService } from './observability/metrics.service';
import { EmbedController } from './embed.controller';
import { SignozProxyController } from './proxy/signoz-proxy.controller';
import { SignozProxyService } from './proxy/signoz-proxy.service';

/** web/dist 产物路径：prod 为 <root>/web-dist，dev 为 ../web/dist（不存在则忽略）。 */
function webDistPath(): string {
  // dist/main.js → dist/../web-dist
  return join(__dirname, '..', 'web-dist');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [signozConfig],
      validationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    // 公开嵌入：120 req/min/IP；healthz/metrics 跳过限流
    ThrottlerModule.forRoot([
      { name: 'embed', ttl: 60_000, limit: 120 },
    ]),
    ServeStaticModule.forRoot({
      rootPath: webDistPath(),
      exclude: ['/api/*', '/healthz', '/metrics'],
    }),
  ],
  controllers: [EmbedController, SignozProxyController, HealthController, MetricsController],
  providers: [
    SignozProxyService,
    MetricsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
  ],
})
export class AppModule {}
