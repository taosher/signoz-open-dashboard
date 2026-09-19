import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/** Env config namespace: signoz (design doc §6.1). */
export const signozConfig = registerAs('signoz', () => ({
  baseUrl: (process.env.SIGNOZ_BASE_URL ?? '').replace(/\/+$/, ''),
  apiKey: process.env.SIGNOZ_API_KEY ?? '',
  port: parseInt(process.env.PORT ?? '8080', 10),
  upstreamTimeoutMs: parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '30000', 10),
  metaTimeoutMs: parseInt(process.env.UPSTREAM_META_TIMEOUT_MS ?? '10000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
}));

export const validationSchema = Joi.object({
  SIGNOZ_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  SIGNOZ_API_KEY: Joi.string().allow('').default(''),
  PORT: Joi.number().default(8080),
  UPSTREAM_TIMEOUT_MS: Joi.number().default(30000),
  UPSTREAM_META_TIMEOUT_MS: Joi.number().default(10000),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
  CORS_ORIGIN: Joi.string().default('*'),
});
