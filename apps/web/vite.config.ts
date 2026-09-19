import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// 嵌入应用：构建目标 Chrome108（设计文档 §4.4）。
// 主题插件架构（设计文档 §7）：core/ + signoz/ + themes/，无 vendor 映射。
// shared 包 dist 为 CJS（供 NestJS 用），web 侧直接消费其 TS 源码，避免 ESM/CJS 互操作问题。
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: '@signoz-open-dashboard/shared',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared/src/index.ts',
        ),
      },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['chrome108'],
    chunkSizeWarningLimit: 4096,
  },
  server: {
    port: 5173,
    proxy: {
      '/api/signoz': 'http://localhost:8080',
      '/healthz': 'http://localhost:8080',
    },
  },
});
