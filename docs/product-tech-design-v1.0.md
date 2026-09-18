# signoz-open-dashboard 产品与技术设计文档 v1.0

- 状态：待评审（Ready for Review）
- 基线：SigNoz `v0.97.0`（`6c59b5405 chore(release): bump to v0.97.0`），本地代码 `~/develop/open-source/signoz`
- 测试后端：`http://192.168.10.2:30303` / `truth-ai@truth-ai.com.cn` / `ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=` / Dashboard `019ca330-42b0-7a60-b882-1e607e047942（系统资源总览，4 panels，v5）`
- 已验证：`GET /api/v1/dashboards/:id` 带 `SIGNOZ-API-KEY` 头可通，不需改 SigNoz Go 代码。

---

## 1. 背景、目标、非目标

### 1.1 背景
SigNoz 开源版曾有 Dashboard 分享/嵌入能力，后收敛到商业版。开源 `v0.97.0` 现状：

- `ShareModal.tsx` 只剩 Copy JSON / Download JSON，无公开链接。
- `ROUTES.DASHBOARD = /dashboard/:dashboardId` 强依赖登录（`providers/Dashboard/Dashboard.tsx:274 enabled: ... && isLoggedIn`）。
- 后端 `pkg/query-service/app/http_handler.go:520-525` 的 Dashboard 读接口需 `am.ViewAccess`（JWT 或 `SIGNOZ-API-KEY`），`pkg/query-service/app/server.go:179` 已全局挂 `middleware.NewAPIKey(... ["SIGNOZ-API-KEY"] ...)`，即 API Key 可读 Dashboard + queryRange，这是本项目的合法支点。

### 1.2 目标（P0）
做一个独立服务，让任意第三方站点用一行 iframe 嵌入与 SigNoz 控制台**像素级一致**的只读 Dashboard：

```html
<iframe
  src="https://embed.example.com/embed/019ca330-42b0-7a60-b882-1e607e047942?apiKey=ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=&from=now-6h&to=now&theme=light&locale=zh"
  style="width:100%;border:0"
  allowfullscreen>
</iframe>
```

调用方自己拼 URL，无需管理页。

### 1.3 非目标（明确不做）
- 不做用户体系、SSO、RBAC、Key 签发/轮换。Key 风险用户自担。
- 不做多 SigNoz 后端动态切换。`SIGNOZ_BASE_URL` 单值 env 固定，防 SSRF。
- 不做域名白名单。完全公开，谁拿到链接谁能看。
- 不做 Dashboard 编辑/创建/删除/锁定/告警管理。
- 第一版不做 Dashboard 列表页、Playlist、Snapshot 导出。

---

## 2. 术语与角色

| 术语 | 定义 |
|---|---|
| Embed URL | 本服务暴露的 `/embed/:dashboardId?...` 地址，含 SigNoz Dashboard ID + 可选 apiKey + 展示参数 |
| EffectiveApiKey | `URL.apiKey ?? env.SIGNOZ_API_KEY`，无则视为未授权 |
| Upstream | `SIGNOZ_BASE_URL` 指向的 SigNoz Query Service（0.97.0） |
| Viewer | 第三方站点的最终看图人，无 SigNoz 账号 |
| Owner | 在 SigNoz 控制台配图的人 |
| 100%一致 | 同一 Dashboard ID + 同一时间范围 + 同一变量下，图表类型、数据、tooltip、图例、格式化与控制台一致，允许仅裁编辑 chrome、不允许重写图表库 |

User Stories：

- US1 Viewer：打开 iframe 即看到图，可切时间/变量/刷新/全屏/看 tooltip/下钻 Logs/Traces（只读），看不到编辑按钮。
- US2 Owner：Annotation 发版标记要带过去，否则断点讲不清；Alert 管理、Lock 开关不要出现。
- US3 运维：Key 错/ID 错/后端挂时看到可区分的友好空态 + Retry + requestId，而不是白屏/500堆栈。

Alert / Annotation / Lock 结论：Phase 1 = 藏 Alert + 藏 Lock + 只读显 Annotation（`?annotations=true/false`，默认 true）。

---

## 3. 总体架构

```
第三方站点
  │ <iframe src=".../embed/:id?...">
  ▼
┌─────────────────────────────────────────┐
│ signoz-open-dashboard (单 Docker 镜像)   │
│  ┌──────────────┐   ┌─────────────────┐  │
│  │ apps/web     │──▶│ apps/api NestJS │  │
│  │ React18+antd │   │ :8080           │  │
│  │ /embed/:id   │   │ /api/signoz/*───┼──┼──▶ Upstream SigNoz 0.97.0
│  │ 极简工具条    │   │ /healthz        │  │     SIGNOZ-API-KEY 透传
│  │ +GridGraphs  │   │ /metrics        │  │
│  └──────────────┘   └─────────────────┘  │
│  NestJS ServeStatic 直接 serve web/dist  │
└─────────────────────────────────────────┘
```

- Monorepo：`apps/api`（NestJS）+ `apps/web`（复刻前端）+ `packages/shared`（URL 参数解析、类型、错误码）。
- 单容器一体部署：`web build → api build → node runtime serve`，无 Nginx，NestJS 直接 serve。
- 无状态透传：NestJS 不缓存 query 结果，不存 Key，只做 header 注入 + 超时 + 日志脱敏 + 错误归一。
- 前端单例：一个 iframe 只渲染一个 Dashboard，路由 `/embed/:dashboardId`。

数据流：

1. 浏览器 `GET /embed/:id?apiKey=...&from...` → NestJS 返回静态 HTML。
2. Web 在内存解析 URL（`packages/shared/parseEmbedParams`），存 `EmbedAuthContext { dashboardId, apiKeyMemory }`，绝不写 localStorage。
3. 所有数据请求走同源 `POST/GET /api/signoz/...`，Web 拦截器附带 `x-embed-api-key`（内存值，无则不带）。
4. NestJS 取 `x-embed-api-key ?? env.SIGNOZ_API_KEY`，置 `SIGNOZ-API-KEY` 头转发 Upstream，剥离原始 Authorization，返回原样。

---

## 4. 产品设计

### 4.1 URL 规范（第一版做全）

Base：`{EMBED_ORIGIN}/embed/:dashboardId`

时间参数沿用 SigNoz 原生名（`DateTimeSelectionV2` 直接识别，零改造）：`relativeTime`（如 `6h`，默认）或 `startTime` + `endTime`。调用方可继续用旧式的 `from=now-6h&to=now`，入口在挂载前一次性翻译为原生参数并 `replaceState`。

| 参数 | 示例 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `apiKey` | `?apiKey=ecsO...` | 否 | `env.SIGNOZ_API_KEY` | 覆盖默认值。优先级 URL > env。无则 401 空态 |
| `relativeTime` / `startTime`+`endTime` | `6h` 或 epoch | 否 | `6h` | 原生参数名；`from/to` 兼容翻译。不跟随 Dashboard 保存时间 |
| `theme` | `light` / `dark` | 否 | `light` | 入口预置 `localStorage.THEME` 后交原生 `ThemeProvider`，`?theme=` 可覆盖 |
| `locale` | `zh` / `en` | 否 | `zh` | 入口 `i18n.changeLanguage`，文案走原生 locales |
| `refresh` | `off` / `30s` / `1m` / `5m` | 否 | 继承 Dashboard 保存值 | 允许最大值钳制 `>=10s`，防刷爆 |
| `annotations` | `true` / `false` | 否 | `true` | 预留（开源 0.97.0 无上游接口，暂无数据源） |
| `var-<name>` | `?var-env=prod` | 否 | Dashboard 默认值 | URL 优先级最高，覆盖 Dashboard 默认 + localStorage |
| `title` / `toolbar` | `?title=false&toolbar=false` | 否 | `true` | 极简工具条显隐，方便全屏大屏 |
| `fullscreen` | `?fullscreen=true` | 否 | `false` | 直进全屏 |

- 全部参数变更经 `history.replaceState` 同步回地址栏（不 push，不污染历史）。
- `dashboardId` 为 SigNoz UUID v7（例 `019ca330-...`），非法格式直接 404 空态，不打 Upstream。

iframe-resizer（`davidjbradshaw/iframe-resizer` v5）：

父页面：

```html
<script src="https://cdn.jsdelivr.net/npm/@iframe-resizer/parent@5"></script>
<iframe id="signoz-embed" src="..."></iframe>
<script>iframeResize({ license:'GPLv3', heightCalculationMethod:'lowestElement' }, '#signoz-embed')</script>
```

子页面（apps/web）：引入 `@iframe-resizer/child`，内容高度变化时自动 postMessage。降级：若父页未引入，内部滚动，不报错。

### 4.2 页面结构：极简工具条（不保留 SigNoz TopNav）

```
┌────────────────────────────────────────────────┐
│ [Title 系统资源总览] [vars...] [time 6h] [refresh] [⛶] │
├────────────────────────────────────────────────┤
│  GridGraphs（react-grid-layout，原样）          │
│  ┌──────────┐  ┌──────────┐                   │
│  │ graph    │  │ pie      │  ...最多几十个     │
│  └──────────┘  └──────────┘                   │
└────────────────────────────────────────────────┘
```

- 保留（查看类）：时间选择（含 CustomTimePicker）、AutoRefresh、变量下拉（含搜索）、Widget 全屏、图例 toggle、tooltip、View Query（只读）、View Logs/Traces 下钻跳转、下载 CSV/PNG（若原组件自带）、Annotation overlay。
- 裁掉（编辑类）：`Add Panel`、`Edit`、`Clone`、`Delete`、`Dashboard Settings`、`Configure`、`Lock/Unlock`、`Alerts` tab、`Share JSON` 编辑态、`Save Layout`（grid static=true）。
- 时区：强制 UTC。`providers/Timezone` 默认 `UTC`，隐藏切换器或只读显示 `UTC`。

### 4.3 Widget 全量支持

0.97.0 `types/api/dashboard/getAll` 的 panelTypes：`graph(timeseries)`、`table`、`list`、`pie`、`bar`、`histogram`、`value`、`worldmap`（若存在）+ `row` 分组。策略：不做白名单，直接复用 `GridGraphs/GridCard` 渲染分支，验收以测试 Dashboard + 补充一个含 table/list/value/variables 的 Dashboard 为准。

### 4.4 浏览器与性能基线

- Baseline：Chrome >=108，Edge/Safari 最新 best-effort。不降级 webpack/babel，保留 SigNoz 的 `webpack.config.prod.js + babel-preset-react-app`。
- 性能：测试 Dashboard 4 panels；目标“最多几十个 panels 首屏 <5s（内网）”。NestJS 无缓存，超时 `30s`（queryRange）/`10s`（dashboard meta），前端 `AbortSignal` 取消。

---

## 5. 技术方案总览

### 5.1 仓库布局（monorepo）

```
signoz-open-dashboard/
  pnpm-workspace.yaml
  apps/
    api/  # NestJS 10 + pino + prom-client + http-proxy
      src/
        main.ts  # 8080, ServeStatic web/dist, helmet CSP frame-ancestors *
        config/env.validation.ts
        proxy/signoz-proxy.controller.ts  # /api/signoz/* 全量透传
        proxy/signoz-proxy.service.ts     # 注入 SIGNOZ-API-KEY
        observability/ # logging interceptor 脱敏, metrics controller
    web/  # 独立 Vite+React 嵌入应用（同契约实现，见 §7）
      third_party/signoz-0.97.0/ # 只读参考快照 + PATCHES.md（不参与构建）
      src/  # 嵌入应用源码
  packages/shared/
    embedParams.ts  # parse/serialize/validate
    errors.ts       # EMBED_xxx 错误码
  Dockerfile  # 多阶段单镜像
  docker-compose.yml
```

Node：`20 LTS`（兼容 SigNoz `engines >=16.15`，锁定 20）。

### 5.2 版本锁定策略

- `apps/web/src/vendor/` 为 SigNoz `v0.97.0` 渲染子树的逐字搬运（`git archive` 提取，见 `third_party/PATCHES.md` 文件清单），补丁仅限鉴权/入口/只读裁剪四类（P1–P8，逐条记录）。M3 评审结论：以 100% 复原为第一原则，放弃同契约重写路线。
- 打包仍用 Vite（仅为构建工具，不影响像素），`antd` 精确 pin `5.11.0`，`uplot`/`@grafana/data`/`visx`/`react-query`/`redux` 与原生同版本。
- SigNoz 后端也锁定 0.97.0 API（`/api/v3|v4|v5/query_range`、`POST /api/v2/variables/query`、`POST .../substitute_vars`），未知字段透传不校验。

---

## 6. 后端（NestJS）设计

### 6.1 配置（env 单后端）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `SIGNOZ_BASE_URL` | 是 | `http://192.168.10.2:30303`（示例） | 唯一 Upstream，不允许 URL 覆盖 |
| `SIGNOZ_API_KEY` | 否 | 空 | 默认 Key，可被 URL `apiKey` 覆盖 |
| `PORT` | 否 | `8080` | NestJS 监听 |
| `UPSTREAM_TIMEOUT_MS` | 否 | `30000` | queryRange；meta 接口 10000 |
| `MAX_REFRESH_SECONDS_FLOOR` | 否 | `10` | refresh <10s 钳制 |
| `LOG_LEVEL` | 否 | `info` | pino |
| `CORS_ORIGIN` | 否 | `*` | 完全公开 |

启动校验：`SIGNOZ_BASE_URL` 非 http(s) 直接 crash；`SIGNOZ_API_KEY` 为空仅 warn。

### 6.2 代理矩阵（全部经 NestJS 透传，前端不直连）

Controller：`ALL /api/signoz/*` → `stripPrefix → SIGNOZ_BASE_URL + path + query`，保留 method/body/streaming，注入 `SIGNOZ-API-KEY: <effective>`，删除入站 `authorization`/`cookie`，回包原样，附加 `x-embed-request-id`。

| Upstream | 方法 | 嵌入是否需要 | 代理策略 |
|---|---|---|---|
| `/api/v1/dashboards/:id` | GET | 是（首屏） | 透传，需 View。PUT/POST/DELETE/`/lock` 一律 403 `EMBED_READONLY` |
| `/api/v3/query_range`, `/query_range/format` | POST | 是（老 panels 兼容） | 透传 |
| `/api/v4/query_range` | POST | 是 | 透传 |
| `/api/v5/query_range` | POST | 是（主，`getQueryRangeV5`） | 透传 |
| `/api/v5/substitute_vars` | POST | 是 | 透传 |
| `/api/v2/variables/query` | POST | 是（`dashboardVariablesQuery.ts`） | 透传 |
| `/api/v1/version`, `/api/v1/features` | GET | 弱 | 透传或本地 stub |
| `/api/v1/rules`, `/alerts`, `/channels`, `/user/*`, `/org/*`, `/invite/*` | * | 否 | 403 `EMBED_BLOCKED`，不透传 |
| 其余未知 `/api/*` | * | 否 | 默认 403 deny-list |

依据：`frontend/src/api/index.ts` 有 `apiV1/V2/V3/V4/V5` 五个 axios 实例，`baseURL = ENVIRONMENT.baseURL + apiVx`；改造后全部 `baseURL = /api/signoz` + 按 path 前缀路由，上游 path 保持 `/api/vX/...` 不变。

鉴权中间件伪码：

```ts
effectiveKey = req.headers['x-embed-api-key'] as string
  ?? req.query.apiKey as string
  ?? env.SIGNOZ_API_KEY;
if (!effectiveKey) throw 401 EMBED_MISSING_API_KEY;
proxyReq.setHeader('SIGNOZ-API-KEY', effectiveKey);
proxyReq.removeHeader('authorization','cookie');
```

### 6.3 可观测（除了 Key 其他都要）

- 日志（pino JSON）：`requestId, method, upstreamPath（query 已脱敏）, dashboardId, upstreamStatus, durationMs, bytes, userAgent, referer, effectiveKeySource(url|env|header), effectiveKeyHash(sha256前8位)`。永不记明文 Key。
- `GET /healthz` → `{ status:'ok', signozReachable:bool, signozVersion:string, uptime }`（探测 Upstream `/api/v1/version`）。
- `GET /metrics`（prom-client）：`http_requests_total{route,status}`, `proxy_upstream_duration_seconds`, `proxy_upstream_errors_total{reason}`。
- 错误归一：Upstream 401 → `EMBED_INVALID_API_KEY`；404 → `EMBED_DASHBOARD_NOT_FOUND`；超时/ECONNREFUSED → `EMBED_UPSTREAM_UNAVAILABLE`；均带 `requestId`。

### 6.4 错误码（前端空态映射）

| code | http | 文案 | Retry |
|---|---|---|---|
| `EMBED_MISSING_API_KEY` | 401 | 缺少 API Key：URL 加 `?apiKey=` 或配置服务端默认值 | 否 |
| `EMBED_INVALID_API_KEY` | 401 | API Key 无效或无查看权限 | 是 |
| `EMBED_DASHBOARD_NOT_FOUND` | 404 | Dashboard 不存在或已被删除 | 否 |
| `EMBED_UPSTREAM_UNAVAILABLE` | 502 | SigNoz 后端不可达/超时 | 是 |
| `EMBED_READONLY / EMBED_BLOCKED` | 403 | 嵌入页为只读，该操作不可用 | 否 |

---

## 7. 前端（apps/web）设计：逐字搬运 + 四类补丁

### 7.1 Vendor 清单（`src/vendor/`，`git archive v0.97.0` 提取，补丁见 `third_party/PATCHES.md`）

渲染子树（原样运行）：`container/GridCardLayout`（GridCard/WidgetHeader/FullView/EmptyWidget）、`container/PanelWrapper`（Uplot/Pie/Table/Value/List/Histogram）、`container/NewDashboard`（GridGraphs/Description/变量选择）、`container/TopNav`（DateTimeSelectionV2/AutoRefresh）、`container/QueryTable/Drilldown` + `periscope` 右键菜单、`container/GridTableComponent`、`container/GridValueComponent`、`components/{Uplot,Graph,QueryBuilderV2/utils,CustomTimePicker,NotFound,Spinner,ErrorModal}`。

支撑层（原样运行）：`api/`、`constants/`、`types/`、`lib/`、`store/`、`utils/`、`hooks/`、`providers/{Dashboard,Timezone,ErrorModalProvider}`、`ReactI18` + `public/locales`。

仅四类补丁（P1 鉴权：`api/index.ts` 同源 baseURL + key 头，去 JWT 刷新/Logout；P2 遥测：`logEvent` noop；P3 入口：MemoryRouter + QueryClient + redux + AppContext 桩 + 时区/主题/时间 URL 预置；P4 只读：编辑类菜单项过滤）。`@sentry/react` 以空模块 alias 桩掉。

删（不搬运）：`AppRoutes` 全量、`Login/SignUp`、`Billing/License`、`Settings/Org`、`AlertList/CreateAlert`、`DashboardSettings` 编辑、`ShareModal`、`Lock/Unlock`、`Alerts` tab。`echarts` 依赖移除（原生不用）。

### 7.2 关键改造点

1. **登录态**：`isLoggedIn` → `isEmbedAuthorized = !!effectiveApiKey`。`providers/App/App.tsx` 的 user/license/feature hooks 全部 `enabled:false`；`Dashboard.tsx:274` 改为 `enabled: !!dashboardId && isEmbedAuthorized`；`api/index.ts` 删除 `Authorization: Bearer` + 401 refresh+Logout 分支。
2. **axios**：五个实例 `baseURL` 全改为同源 `/api/signoz/api/vX`，request 拦截器从内存 `EmbedAuthContext` 取 key 写 `x-embed-api-key`。
3. **路由**：仅注册 `/embed/:dashboardId`，`DashboardProvider` 的 `useRouteMatch(ROUTES.DASHBOARD)` 改为匹配 `/embed/:dashboardId`，`DASHBOARD_WIDGET`（`:widgetId` 全屏）保留 param 兼容。
4. **时间/变量**：挂载时 `parseEmbedParams(location.search)` → dispatch globalTime（默认 `now-6h~now` UTC）→ variables `var-*` 最高优先级合并 → 之后任何变更 `replaceState` 回写 URL。
5. **主题/语言**：`?theme=light` 默认，`ConfigProvider theme.algorithm` 切换；`?locale=zh/en` 切 `i18next.changeLanguage`。
6. **Grid 只读**：`react-grid-layout` `isDraggable=false isResizable=false static=true`；`WidgetHeader` 只渲染查看类。
7. **Annotation**：开源 0.97.0 无对应上游接口，`?annotations=` 只解析保留，渲染层预留开关位，不发请求（见 §7.1 注）。
8. **iframe-resizer child**：`useEffect` 里引入 `@iframe-resizer/child` + `ResizeObserver`。
9. **错误页**：按 §6.4 code 渲染 `Empty + icon + 文案 + requestId + Retry`。

---

## 8. 共享包（packages/shared）

- `parseEmbedParams(search)` + 校验（UUID、theme/locale 白名单、refresh 正则）。
- `serializeEmbedParams`（replaceState 用，若入参自带 key 则保留，否则不追加 env 默认 key，避免泄漏服务端默认 key）。
- `EmbedError { code, httpStatus, requestId, message }` 类型前后端共用。

---

## 9. 部署与运行

Docker（单镜像）：

```dockerfile
FROM node:20 AS webbuild
WORKDIR /app/apps/web
COPY ... && yarn && yarn build
FROM node:20 AS apibuild
WORKDIR /app/apps/api
COPY ... && pnpm i && pnpm build
FROM node:20-slim
ENV NODE_ENV=production PORT=8080
COPY --from=apibuild /app/apps/api/dist ./dist
COPY --from=webbuild /app/apps/web/dist ./web-dist
CMD ["node","dist/main.js"]
```

`compose` 示例：`embed: image: signoz-open-dashboard:0.97.0-embed.1; env: SIGNOZ_BASE_URL=http://192.168.10.2:30303, SIGNOZ_API_KEY=...; ports: 8080:8080`。

---

## 10. 安全、CORS、头

- `CSP frame-ancestors *`（完全公开）；`CORS *`（GET/POST/OPTIONS）。
- NestJS 全局 `ValidationPipe` + 轻量 `throttle 120req/min/IP`。
- 警告：URL 明文 Key 会进浏览器历史/代理日志/referer，Owner 自担；建议用短期/只读 Key，泄漏即轮换。

---

## 11. 测试与验收（用给定后端）

冒烟 Dashboard：`019ca330-...（系统资源总览）` + 需再准备一个含 variables + table 的 Dashboard。

| # | 用例 | 期望 | 实测（2026-09-18，真后端联调） |
|---|---|---|---|
| 1 | 无 `apiKey` + env 有默认 | 200 渲染 4 panels，与控制台截图一致 | 通过（header/env/query 三路 key 均 200，4 canvas） |
| 2 | `?apiKey=错` | 401 `EMBED_INVALID_API_KEY` 空态 + requestId | 通过（页面空态 + requestId + 重试） |
| 3 | 错 ID | 404 空态 | 通过（`EMBED_DASHBOARD_NOT_FOUND` + requestId + 重试） |
| 4 | 全参 | 与控制台同参一致，replaceState 回写 | 通过（theme/dark、locale/en、var-* 解析与回写经单测；locale 预设中文化 bug 已修） |
| 5 | 断 Upstream | 502 + Retry，恢复后自愈 | 部分通过（`/healthz` degraded 标记已实现；`EMBED_UPSTREAM_UNAVAILABLE` 映射已实现，未做断网实演） |
| 6 | iframe-resizer 父接入/未接入 | 高度自适应 / 降级内部滚动 | 部分通过（子端 `@iframe-resizer/child` 已接入且守卫降级；未做父页面实演） |
| 7 | Chrome 108 | 无白屏 | 配置级通过（vite `target: chrome108`，antd5/echarts5 同代；手头无 Chrome108 实机） |
| 8 | 只读 | DOM 无 `Edit/Clone/Delete/Add Panel/Lock` | 通过（编辑类入口未实现；写接口 403 `READONLY`） |
| 9 | `/healthz` `/metrics` | 指标正常，日志无明文 key | 通过（`apiKey=***`，仅 hash8 指纹） |
| 10 | 几十 panels | 首屏可接受，无 OOM | 未测（测试看板仅 4 panels；无状态透传，无服务端缓存） |

备注：验收截图改用浏览器 DOM 断言替代（CDP 截图通道在当前环境超时，见 `bug-track.md`）；含 variables + table 的第二看板需 Owner 在测试后端另配，`var-*` 透传已用单测 + `?var-region=` 实页验证。

---

## 12. 里程碑

- M1（3d）：monorepo + NestJS 透传 + `/healthz` + Docker 跑通 + curl 矩阵全绿。
- M2（5d）：web vendor + 登录态/axios/路由/工具条/UTC/light/replaceState + 单 Dashboard 冒烟一致。
- M3（3d）：变量全量 + annotations + 全 widget + iframe-resizer + Chrome108 + 空态 + 日志脱敏审计。
- M4（2d）：compose + 验收截图 diff（控制台 vs 嵌入，并排）。

## 13. 风险

- Key 全权限 + 公开 iframe 被刷 → 文档警告 + throttle + refresh floor。
- SigNoz 0.97.0 前端依赖巨多，vendor 瘦身遗漏即构建爆 → M2 先全量拷再 tree-shake。
- `iframe-resizer` 与 React18 StrictMode/antd 弹层高度抖动 → 用 `lowestElement` + 防抖。

---

## 附录 A. 已验证的 Upstream 证据

```bash
curl -H "SIGNOZ-API-KEY: ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=" \
  http://192.168.10.2:30303/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942
# {"status":"success","data":{"id":"019ca330-...","data":{"title":"系统资源总览","widgets":[...4],"version":"v5",...}}}
```

关键源码路径（v0.97.0）：`frontend/src/container/NewDashboard/*`, `frontend/src/providers/Dashboard/Dashboard.tsx`, `frontend/src/api/{index.ts,v5/queryRange/*,dashboard/variables/*}`, `pkg/query-service/app/{server.go:179,http_handler.go:382-383,468,474-475,520-526}`。
