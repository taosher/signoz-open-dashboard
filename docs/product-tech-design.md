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
  src="https://embed.example.com/embed/019ca330-42b0-7a60-b882-1e607e047942?apiKey=ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=&from=now-6h&to=now&theme=legacy&locale=zh"
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

- Monorepo：`apps/api`（NestJS）+ `apps/web`（主题插件架构自研前端，见 §7）+ `packages/shared`（URL 参数解析、类型、错误码）。
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

时间参数沿用 SigNoz 原生名（`DateTimeSelectionV2` 直接识别，零改造）：`relativeTime`（如 `30m`，默认）或 `startTime` + `endTime`。调用方可继续用旧式的 `from=now-30m&to=now`，入口在挂载前一次性翻译为原生参数并 `replaceState`。

| 参数 | 示例 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `apiKey` | `?apiKey=ecsO...` | 否 | `env.SIGNOZ_API_KEY` | 覆盖默认值。优先级 URL > env。无则 401 空态 |
| `relativeTime` / `startTime`+`endTime` | `30m` 或 epoch | 否 | `30m` | 原生参数名；`from/to` 兼容翻译。不跟随 Dashboard 保存时间 |
| `theme` | `legacy` / `shadcn` | 否 | `legacy` | 主题注册表见 §7.2，未知值回退 `legacy`；各主题可用不同组件库 |
| `mode` | `light` / `dark` | 否 | `light` | 深浅色（与主题正交，见 §7.4-5）；未知值回退 `light` |
| `locale` | `zh` / `en` | 否 | 跟随主题默认 | 语言由当前主题实现（legacy 提供工具条中英切换，见 `localeControl`），core 不规定 |
| `refresh` | `off` / `30s` / `1m` / `5m` | 否 | 继承 Dashboard 保存值 | 允许最大值钳制 `>=10s`，防刷爆 |
| `annotations` | `true` / `false` | 否 | `true` | 预留（开源 0.97.0 无上游接口，暂无数据源） |
| `var-<name>` | `?var-env=prod` | 否 | Dashboard 默认值 | URL 优先级最高，覆盖 Dashboard 默认 + localStorage |
| `title` / `toolbar` | `?title=false&toolbar=false` | 否 | `true` | 极简工具条显隐，方便全屏大屏 |
| `timeControl` / `refreshControl` / `modeControl` / `fullscreenControl` / `localeControl` | `show` / `hidden` / `disabled` | 否 | `show` | 各控制项三态：`show`（默认，可用）、`hidden`（不渲染）、`disabled`（置灰不可点）；`toolbar=false` 时整体隐藏 |
| `fullscreen` | `?fullscreen=true` | 否 | `false` | 直进全屏（加载后自动进入；工具条按钮可在全屏/退出全屏间切换） |

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
    web/  # 独立 Vite+React 嵌入应用（主题插件架构，见 §7）
      third_party/ # take-snapshot.sh（参考快照生成器）+ PATCHES.md（语义对照）
      src/  # core/ + signoz/ + themes/（见 §7.1）
  packages/shared/
    embedParams.ts  # parse/serialize/validate
    errors.ts       # EMBED_xxx 错误码
  Dockerfile  # 多阶段单镜像
  docker-compose.yml
```

Node：`20 LTS`（兼容 SigNoz `engines >=16.15`，锁定 20）。

### 5.2 版本锁定策略

- `apps/web/third_party/signoz-0.97.0/` 为 SigNoz `v0.97.0` 只读参考快照（`take-snapshot.sh` 可再造，不入库），仅供查询语义对照，不参与构建、不逐字搬运。M4 评审结论：彻底放弃 100% 复原路线（逐字搬运的依赖闭包与 Provider 链成本过高，且与主题扩展目标冲突），回到自研 UI + 主题插件架构。
- 前端依赖由各主题自行声明（legacy 见 §7.3）；构建仍用 Vite。
- SigNoz 后端 API 锁定 0.97.0（`/api/v3|v4|v5/query_range`、`POST /api/v2/variables/query`、`POST .../substitute_vars`），未知字段透传不校验。

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
| `/api/v2/variables/query` | POST | 是（QUERY 型变量候选） | 透传 |
| `/api/v1/fields/values` | GET | 是（DYNAMIC 型变量候选，`normalizedValues`） | 透传 |
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

## 7. 前端（apps/web）设计：主题插件架构（M3 评审结论，以自研 UI 为第一原则）

> 方向声明：放弃 100% 复原 SigNoz UI。前端使用 SigNoz 的数据契约（v5 查询语义），渲染层全部自研。
> `apps/web/third_party/signoz-0.97.0/` 仅为只读参考快照（`take-snapshot.sh` 生成，可再造，不入库），供查询语义对照，不参与构建、不逐字搬运。

### 7.1 分层：core（不变）+ themes（可插拔）

```
apps/web/src/
  core/        # 与主题无关：路由(/embed/:id)、鉴权(内存 Key)、取数 hooks、
               # 时间/变量/刷新状态、replaceState、iframe-resizer、空态与错误映射
  signoz/      # SigNoz 数据契约实现：v5 payload 装配、响应解析、panel/requestType 映射、
               # 单位格式化（对照快照，逻辑一致即可，不求逐行相同）
  themes/
    registry.ts      # 主题注册表：name → ThemeModule；未知 name 回退 legacy
    legacy/          # 默认主题（?theme= 缺省/legacy）：antd + echarts 系自研 UI
    <future>/        # 未来主题：可用任意组件库（如 shadcn 系），只需实现 ThemeModule 契约
```

### 7.2 ThemeModule 契约（新增主题唯一需要实现的接口）

```ts
interface ThemeModule {
  name: string;                       // 如 'legacy'，与 ?theme= 取值对应
  TokensProvider: ComponentType;      // 主题 token（CSS 变量 / ConfigProvider / echarts theme 等）
  Toolbar: ComponentType<ToolbarProps>;   // 极简工具条（标题+时间+刷新+变量+全屏），允许各主题形态不同
  WidgetCard: ComponentType<WidgetProps>; // 按 panelTypes 分发渲染（graph/table/list/pie/bar/histogram/value）
  ErrorState: ComponentType<ErrorProps>;  // EMBED_ 错误码空态 + Retry + requestId
}
```

- `ToolbarProps` 允许扩展可选字段（如 `variableOptions` 解析候选、`mode/onModeChange` 深浅切换），新主题可忽略；必填契约不变。
- `WidgetProps.refreshing` 为可选扩展（后台取数中的弱提示），缺省忽略。
- core 只依赖该契约，不依赖任何主题的具体组件库；新增主题不得修改 core（除 registry 注册一行）。
- 各主题自带依赖（如 legacy 用 antd/echarts，未来主题用 shadcn 系），互不污染；构建时全量打包，运行时按 `?theme=` 选择。
- Dashboard 级别体验（UTC、只读 grid、变量优先级、replaceState、Key 只放内存）由 core 保证，各主题不得破坏。

### 7.3 legacy 主题（默认，P0 范围）

- 组件库：antd（5.x，主版本锁定后不再升级）+ echarts 系自研图表，视觉贴近 SigNoz 浅色控制台即可，不做像素级对齐；`?mode=dark` 时切 antd 暗算法 + 深色图表前景，浅色为默认。
- 复用 `src/signoz/` 的查询语义（requestType 映射、builder/formula/promql/CH 信封、毫秒时间、table 格式化开关；legend 优先级 alias > legend > expression）。
- 保留项（查看类）：时间选择、自动刷新、变量展示、Widget 全屏/下载 CSV、tooltip、图例 toggle。裁掉项（编辑类）：Add Panel/Edit/Clone/Delete/Settings/Lock/Alerts。
- 时区强制 UTC；Annotation：开源 0.97.0 无上游接口，`?annotations=` 只解析保留。

### 7.4 关键行为（core 保证，与主题无关）

1. **登录态**：无 JWT；`apiKey(URL) ?? env.SIGNOZ_API_KEY`，内存存放，不写 localStorage。
2. **请求**：一律同源 `/api/signoz/*`，拦截器附 `x-embed-api-key`（无则不带）。
3. **路由**：仅 `/embed/:dashboardId`。
4. **时间/变量**：默认 `now-30m~now` UTC；`var-*` 优先级最高；变更 `replaceState` 回写（不回写 env 默认 key）。时间选择含快速范围 + 自定义起止（RangePicker 到秒）；工具条只展示 UTC 时间，不提供时区切换。变量一律按 `name` 归一（看板 JSON 以 id 为键，`name` 为准）；QUERY 型经 `/api/v2/variables/query`、DYNAMIC 型经 `/api/v1/fields/values` 解析候选，无历史选择时多选默认全选、单选取默认值或首候选。
5. **主题/语言/深浅色**：`?theme=legacy` 默认（未知值回退 legacy）；`?mode=light/dark` 默认 light（未知值回退 light），由 core 经上下文提供，各主题自行表达；语言跟随主题实现（legacy 工具条经 `localeControl` 提供中英切换），core 不规定。
6. **Grid 只读**：不可拖拽；`?annotations=` 预留。
7. **iframe-resizer child**：core 统一接入。
8. **错误页**：core 按 §6.4 code 映射，主题只负责样式表达。

### 7.5 升级策略（锁定 0.97.0 API，不跟随前端版本）

- 后端 API 锁定 0.97.0（`/api/v3|v4|v5/query_range`、`POST /api/v2/variables/query`、`POST .../substitute_vars`），未知字段透传不校验。
- 参考快照仅用于新人理解查询语义；SigNoz 后续版本的前端变更与本仓库无关，无需合 patch。

### 7.6 shadcn 主题（`?theme=shadcn`）

- 组件库：tailwind（preflight 关闭，不污染 legacy）+ Recharts（对照 `ui.shadcn chart`：ChartContainer 组合 + CSS 变量配色）+ Base UI 原语（Select/Popover/ToggleGroup/Checkbox，与图表同体系）+ lucide 图标；
- 取数/变量/图例/单位语义与 legacy 共用 `core/` + `signoz/`，仅渲染层不同；深浅色同样经 core 上下文（`.schn-dark` class 变体）。

---

## 8. 共享包（packages/shared）

- `parseEmbedParams(search)` + 校验（UUID、`theme` 注册表名、`mode`、`locale`、refresh 正则、控制项三态 `show/hidden/disabled`）。
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

| # | 用例 | 期望 | 状态 |
|---|---|---|---|
| 1 | 无 `apiKey` + env 有默认 | 200 渲染 4 panels | 通过（后端已验收；前端待 legacy 主题重实现后复验） |
| 2 | `?apiKey=错` | 401 `EMBED_INVALID_API_KEY` 空态 + requestId | 通过（后端映射；前端按 §7.4-8 重实现） |
| 3 | 错 ID | 404 空态 | 通过（同上） |
| 4 | 全参 | 参数解析 + replaceState 回写 | 待复验（`theme=legacy` 新语义 + `from/to` 兼容翻译） |
| 5 | 断 Upstream | 502 + Retry，恢复后自愈 | 部分通过（后端已实现，未做断网实演） |
| 6 | iframe-resizer 父接入/未接入 | 高度自适应 / 降级内部滚动 | 待实现（core 统一接入） |
| 7 | Chrome 108 | 无白屏 | 待验（vite `target: chrome108` 保留） |
| 8 | 只读 | 无编辑类入口；写接口 403 | 通过（后端 `READONLY`/`BLOCKED`；前端不实现编辑入口） |
| 9 | `/healthz` `/metrics` | 指标正常，日志无明文 key | 通过 |
| 10 | 几十 panels | 首屏可接受，无 OOM | 未测 |
| 11 | `?theme=未知值` | 回退 legacy | 待实现（registry 回退逻辑 + 单测） |

备注：不再做与控制台的像素级截图 diff（方向已改为视觉贴近，见 §7）；含 variables + table 的第二看板仍需 Owner 另配。

---

## 12. 里程碑（M4 修订版：回退自研 UI + 主题插件化）

- M1（已完成）：monorepo + NestJS 透传 + `/healthz` + `/metrics` + curl 矩阵全绿。
- M5（前端重做）：`core/`（路由/鉴权/取数/时间变量/replaceState/空态映射）+ `signoz/`（查询语义）+ `themes/legacy`（默认主题全量 panel）+ registry 回退；冒烟 Dashboard 渲染验收。
- M6：iframe-resizer、Chrome108、断网演练、第二看板（variables+table）、文档收尾。
- 已归档（不再执行）：M2–M4 旧计划（自研 UI 初版已验证后废弃）、100% 复刻路线（vendor 已删除，见 bug-track 决策记录）。

## 13. 风险

- Key 全权限 + 公开 iframe 被刷 → 文档警告 + throttle + refresh floor。
- 主题膨胀：新增主题只许加 `themes/<name>/` + registry 一行，禁止改 core；core 出现主题分支时必须重构回契约。
- `iframe-resizer` 与 React18 StrictMode/antd 弹层高度抖动 → 用 `lowestElement` + 防抖。

---

## 附录 A. 已验证的 Upstream 证据

```bash
curl -H "SIGNOZ-API-KEY: ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=" \
  http://192.168.10.2:30303/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942
# {"status":"success","data":{"id":"019ca330-...","data":{"title":"系统资源总览","widgets":[...4],"version":"v5",...}}}
```

关键源码路径（v0.97.0）：`frontend/src/container/NewDashboard/*`, `frontend/src/providers/Dashboard/Dashboard.tsx`, `frontend/src/api/{index.ts,v5/queryRange/*,dashboard/variables/*}`, `pkg/query-service/app/{server.go:179,http_handler.go:382-383,468,474-475,520-526}`。
