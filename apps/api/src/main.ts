import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EmbedExceptionFilter } from './observability/embed-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('bootstrap');

  // Public embedding is intentional (design doc §10): frame-ancestors *, CORS *.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'frame-ancestors': ['*'],
        },
      },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: false,
    }),
  );
  app.enableCors({ origin: '*', methods: 'GET,POST,PUT,OPTIONS' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalFilters(new EmbedExceptionFilter());

  const port: number = config.get<number>('signoz.port') ?? 8080;
  const baseUrl: string = config.get<string>('signoz.baseUrl') ?? '';
  const hasDefaultKey = Boolean(config.get<string>('signoz.apiKey'));
  await app.listen(port);
  logger.log(
    `embed api listening on :${port} upstream=${baseUrl} defaultKey=${hasDefaultKey ? 'set' : 'empty'}`,
  );
}

void bootstrap();
