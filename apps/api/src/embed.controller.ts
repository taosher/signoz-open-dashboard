import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';

/**
 * SPA 入口：/embed/:dashboardId 返回 web 构建产物 index.html，
 * 实际数据由浏览器经 /api/signoz 同源接口加载。
 */
@Controller('embed')
export class EmbedController {
  @Get('*')
  page(@Res() res: Response): void {
    const index = join(__dirname, '..', 'web-dist', 'index.html');
    if (!existsSync(index)) {
      res.status(503).json({
        code: 'EMBED_BAD_REQUEST',
        message: '前端产物缺失，请先构建 apps/web 并同步 web-dist',
      });
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    createReadStream(index).pipe(res);
  }
}
