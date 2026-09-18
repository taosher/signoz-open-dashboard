import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const vendor = (p: string): string =>
  path.resolve(__dirname, 'src/vendor', p);

// 嵌入应用：构建目标 Chrome108（设计文档 §4.4）。
// src/vendor 为 SigNoz 0.97.0 逐字搬运，原生以 src 为根的绝对导入在此映射。
// shared 包 dist 为 CJS（供 NestJS 用），web 侧直接消费其 TS 源码，避免 ESM/CJS 互操作问题。
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: [
      {
        find: '@signoz-open-dashboard/shared',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared/src/index.ts',
        ),
      },
      // @sentry/react 桩（P8）：嵌入页不上报
      { find: /^@sentry\/react$/, replacement: vendor('../shims/sentry.ts') },
      // EMBED-P1/P2/P3：精确替换优先于下面的通用 vendor 映射
      { find: /^api$/, replacement: path.resolve(__dirname, 'src/embed/apiIndex.ts') },
      {
        find: /^api\/common\/logEvent$/,
        replacement: path.resolve(__dirname, 'src/embed/logEvent.ts'),
      },
      {
        find: /^providers\/App\/App$/,
        replacement: path.resolve(__dirname, 'src/embed/AppContext.tsx'),
      },
      {
        find: /^ReactI18$/,
        replacement: vendor('ReactI18/index.tsx'),
      },
      { find: /^api(\/.*)?$/, replacement: vendor('api$1') },
      { find: /^assets(\/.*)?$/, replacement: vendor('assets$1') },
      { find: /^components(\/.*)?$/, replacement: vendor('components$1') },
      { find: /^constants(\/.*)?$/, replacement: vendor('constants$1') },
      { find: /^container(\/.*)?$/, replacement: vendor('container$1') },
      { find: /^hooks(\/.*)?$/, replacement: vendor('hooks$1') },
      { find: /^pages(\/.*)?$/, replacement: vendor('pages$1') },
      { find: /^parser(\/.*)?$/, replacement: vendor('parser$1') },
      { find: /^lib(\/.*)?$/, replacement: vendor('lib$1') },
      { find: /^periscope(\/.*)?$/, replacement: vendor('periscope$1') },
      { find: /^providers(\/.*)?$/, replacement: vendor('providers$1') },
      { find: /^store(\/.*)?$/, replacement: vendor('store$1') },
      { find: /^store(\/.*)?$/, replacement: vendor('store$1') },
      { find: /^types(\/.*)?$/, replacement: vendor('types$1') },
      { find: /^utils(\/.*)?$/, replacement: vendor('utils$1') },
      { find: /^ReactI18$/, replacement: vendor('ReactI18/index.tsx') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ['legacy-js-api'] },
    },
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
