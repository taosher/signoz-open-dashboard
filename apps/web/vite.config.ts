import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Embed app: build target Chrome108 (design doc §4.4).
// Theme plugin architecture (design doc §7): core/ + signoz/ + themes/, no vendor mapping.
// tailwind is only used by the shadcn theme (preflight disabled, see themes/shadcn/shadcn.css, does not pollute legacy).
// The shared package dist is CJS (for NestJS); the web side consumes its TS source directly to avoid ESM/CJS interop issues.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
