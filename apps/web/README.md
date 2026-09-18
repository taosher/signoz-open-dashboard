# apps/web（嵌入前端）

独立 Vite + React18 + antd5 + echarts5 应用（设计文档 §7，同契约独立实现）。

- 入口：`GET /embed/:dashboardId?...`（由 `apps/api` 的 `EmbedController`  serving `dist/index.html`）
- 鉴权：`src/embed/auth.tsx` 内存 `apiKey`，不写 localStorage；无 key 时服务端回退 env 默认值
- 数据：一律同源 `/api/signoz/*`（`src/api/client.ts`），查询语义对照见 `third_party/PATCHES.md`
- 参考快照：`third_party/signoz-0.97.0/`（`take-snapshot.sh` 从 `~/develop/open-source/signoz@v0.97.0` 生成，只读，不参与构建）

本地开发：根目录 `pnpm dev:web`（vite :5173，`/api/signoz` 代理到 `:8080`，需同时 `pnpm dev:api`）。
