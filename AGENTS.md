# AGENTS.md

> 本文件是 agent 在此仓库的工作契约。与下文冲突时，以 `docs/product-tech-design-v1.0.md` 为准。

## 1. 唯一事实源（docs-first）

- `docs/product-tech-design-v1.0.md` 是唯一事实源（Single Source of Truth）。
- 任何设计变更（URL 参数、代理矩阵、裁剪清单、env、错误码、部署形态）必须先改该文档，再写代码。文档未更新的代码变更视为无效。
- 文档与代码/注释冲突时，以文档为准，并在 `bug-track.md` 记一笔。

## 2. 仓库现状与边界

- 本仓库目标结构（见设计文档 §5.1）：`apps/api`（NestJS）+ `apps/web`（复刻 SigNoz 前端）+ `packages/shared` + 单 Docker 镜像。M1 已落地 monorepo 空架（`apps/web` 为占位构建，M2 复刻前端），命令见 §4。
- SigNoz 参考实现是只读的：`~/develop/open-source/signoz @ v0.97.0`。禁止修改它；复用前端走 `third_party/signoz-0.97.0` 快照 + `PATCHES/` 记录 diff。
- 后端唯一 Upstream 由 env `SIGNOZ_BASE_URL` 固定（单后端，防 SSRF）。禁止在 URL 参数里接受后端地址。
- 测试后端与验收 Dashboard 以设计文档冒烟表为准，`curl` 验证见设计文档附录 A。调试优先用 `GET /api/v1/dashboards/:id` + `SIGNOZ-API-KEY` 头验证连通性。

## 3. 工作流（五条硬约束）

1. **先文档后代码**：改设计 → 改 `docs/product-tech-design-v1.0.md` → 再改代码。
2. **提交信息**：英文、conventional commits、祈使句、首行 ≤72 字符。类型仅用 `feat/fix/docs/refactor/test/chore`。例：`feat(api): proxy query_range with api key injection`。
3. **技术文档**：一律中文（含 `docs/`、注释中的设计说明、PR 描述）。仅 commit message 用英文。
4. **踩坑记录**：开发/调试/测试中任何坑，立即以表格行追加到根目录 `bug-track.md`，列固定为 `日期/现象/根因/处理/状态/关联`，不另开文件。
5. **待办唯一入口**：`TODOS.md` 是唯一待办列表。只有“代码完成 + 测试通过”后才可更新对应任务为完成；禁止口头标记完成。

## 4. 命令与验证

- 包管理 `pnpm@9`（根 `package.json` 锁定），Node `>=20`。首次：`pnpm install`。
- 构建全部：`pnpm build`；单包：`pnpm build:api` / `pnpm build:shared`（`apps/web` 当前为 M1 占位构建）。
- 测试全部：`pnpm test`；API 单测：`pnpm test:api`；API e2e（含 mock 上游的代理矩阵）：`pnpm --filter @signoz-open-dashboard/api test:e2e`。
- 类型检查：`pnpm typecheck`（或按包 `pnpm --filter <pkg> typecheck`）。
- 本地启动 API：`SIGNOZ_BASE_URL=http://192.168.10.2:30303 SIGNOZ_API_KEY=<key> pnpm dev:api`（dev，watch），生产构建产物：`SIGNOZ_BASE_URL=... node apps/api/dist/main.js`。健康检查：`GET /healthz`，指标：`GET /metrics`。
- 本地开发前端：`pnpm dev:web`（vite :5173，`/api/signoz` 代理到 `:8080`，需同时起 `dev:api`）；全量构建后自动同步 `apps/web/dist` → `apps/api/web-dist`（`scripts/sync-web-dist.js`，NestJS ServeStatic 挂载点）。
- 真后端联调矩阵（dashboard GET / query_range 透传 / 写接口 403 / 错误码映射）见 `TODOS.md` M1 验收记录，探活用 `GET /api/signoz/api/v1/dashboards/:id` + `x-embed-api-key` 头。
- SigNoz 参考仓库命令只用于查阅，不在此仓库执行构建（除 `git archive/show` 取快照、`curl` 探活）。
- 文件操作用专用工具（`read/edit/write`），`bash` 仅用于 `git/curl/docker/pnpm` 等终端操作，不用 `cat/sed/awk/echo` 读写文件。

## 5. 红线（agent 最易踩错）

- 永不记录明文 API Key：日志、bug-track、TODOS、commit、文档新增内容中只允许 `effectiveKeySource/effectiveKeyHash(前8位）`，query 序列化前先脱敏 `apiKey/apikey/access_token`（大小写不敏感）。
- 代理默认拒绝：除设计文档 §6.2 白名单（dashboards GET、v3/v4/v5 query_range、substitute_vars、v2 variables/query、version/features）外，其余 `/api/*` 一律 403，不透传写接口（dashboard PUT/POST/DELETE、`/lock`、rules/alerts/user/org）。
- 前端 Key 只放内存（`EmbedAuthContext`），禁止写 `localStorage/cookie/URL 回写 env 默认 key`（`serializeEmbedParams` 规则见 §8）。
- iframe 公开嵌入：`CSP frame-ancestors *`、`CORS *` 是有意为之，不要“顺手加固”为 DENY。
- Node 锁定 `20 LTS`；`apps/web` 逐字搬运 SigNoz 0.97.0 渲染子树（见设计文档 §7，打包仍用 Vite），`antd` 精确 pin `5.11.0`，`uplot/@grafana/data/visx/react-query/redux` 与原生同版本；`echarts` 已移除（原生不用），不要引回。

## 6. Skills

- 写 NestJS 代码前先读仓库内 skill：`.agents/skills/nestjs-best-practices/SKILL.md`（DTO/validation、exception filter、health check、rate-limit 规范）。
- 中文技术文档润色可用 `.agents/skills/humanizer-zh/SKILL.md`，但不得改变设计含义。
