import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';

/**
 * SPA entry: /embed/:dashboardId serves the web build output index.html,
 * real data is loaded by the browser via the same-origin /api/signoz API.
 */
@Controller('embed')
export class EmbedController {
  @Get('*')
  page(@Res() res: Response): void {
    const index = join(__dirname, '..', 'web-dist', 'index.html');
    if (!existsSync(index)) {
      res.status(503).json({
        code: 'EMBED_BAD_REQUEST',
        message: 'Frontend assets missing, build apps/web and sync web-dist first',
      });
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    createReadStream(index).pipe(res);
  }
}
