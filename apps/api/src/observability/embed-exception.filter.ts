import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ensureRequestId } from '../proxy/proxy.util';

/**
 * 全局异常归一：输出 { code, message, requestId, path }。
 * 已是 HttpException 且 body 含 code 的直接透传并补 requestId。
 */
@Catch()
export class EmbedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(EmbedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = ensureRequestId(
      (req.headers['x-request-id'] as string) ?? '',
    );

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        res
          .status(status)
          .setHeader('x-embed-request-id', requestId)
          .json({ ...(body as object), requestId });
        return;
      }
      res.status(status).setHeader('x-embed-request-id', requestId).json({
        code: 'EMBED_BAD_REQUEST',
        message: exception.message,
        requestId,
        path: req.path,
      });
      return;
    }

    this.logger.error(
      `unhandled ${req.method} ${req.path}: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'EMBED_UPSTREAM_UNAVAILABLE',
      message: '服务异常，请重试',
      requestId,
      path: req.path,
    });
  }
}
