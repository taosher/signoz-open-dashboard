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

/**
 * 环境文件：dev 模式（NODE_ENV=development）加载仓库根 `.env.development`，
 * 其余加载根 `.env`；文件缺失则忽略，显式环境变量优先（dotenv 不覆盖已有值）。
 * src/config 与 dist/config 到仓库根都是上三级，dev 与生产构建通用。
 */
function envFilePath(): string {
  const file = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
  return join(__dirname, '..', '..', '..', file);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePath(),
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
