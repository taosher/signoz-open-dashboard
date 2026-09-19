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

/** web/dist output path: prod is <root>/web-dist, dev is ../web/dist (ignored if missing). */
function webDistPath(): string {
  // dist/main.js → dist/../web-dist
  return join(__dirname, '..', 'web-dist');
}

/**
 * Env file: dev mode (NODE_ENV=development) loads repo-root `.env.development`,
 * otherwise loads root `.env`; missing files are ignored, explicit env vars win (dotenv never overrides existing values).
 * src/config and dist/config are both three levels below the repo root, shared by dev and production builds.
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
    // Public embedding: 120 req/min/IP; healthz/metrics skip rate limiting
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
