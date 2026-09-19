# bug-track.md

> 踩坑记录。每次开发/调试/测试遇到坑，立即追加一行。禁止记录明文 API Key（只写 `effectiveKeySource/effectiveKeyHash(前8位)`）。

| 日期 | 现象 | 根因 | 处理 | 状态 | 关联 |
|---|---|---|---|---|---|
| 2026-09-18 | `pnpm test:e2e` 报 `test/jest-e2e.json is not valid JSON` | 该文件实际是 JS（`module.exports`），后缀误写 `.json` | 改名为 `test/jest-e2e.js` 并同步 `package.json` 的 `test:e2e` 脚本 | 已解决 | M1 e2e |
| 2026-09-18 | `query_range POST` e2e 用例超时挂起（5s），其余 6 个通过 | Express/Nest 默认 json bodyParser 已消费请求流，controller 再监听 `req on('data'/'end')` 永远等不到事件 | 改用已解析的 `req.body` 重序列化后转发，并在 controller 注释说明禁手动读流 | 已解决 | M1 代理转发 |
| 2026-09-18 | e2e `Config validation error: SIGNOZ_BASE_URL is required` | `ConfigModule.forRoot` 在 import 装饰器求值时即校验，而 env 在 `beforeAll` 才设置 | 新增 `test/setup-e2e.ts` 经 jest `setupFiles` 在 import 前注入占位 env | 已解决 | M1 e2e |
| 2026-09-18 | `pnpm test` 在 shared 包失败 `jest: command not found` | shared 未安装 jest 却声明 `jest --passWithNoTests` | shared 的 `test` 改为 `tsc --noEmit`（该包暂无单测，类型检查即验证） | 已解决 | M1 test |
| 2026-09-18 | 重启服务报 `EADDRINUSE :::8080`，curl 打到旧进程 | 旧 `node dist/main.js` 未杀干净（pid 文件被覆盖）致验收走错进程 | 改用 `pkill -f apps/api/dist/main.js` + `lsof -i :8080` 确认端口释放后再起 | 已解决 | M1 联调 |
| 2026-09-18 | web 构建 `EMBED_ERROR_CODES is not exported by shared/dist` | shared dist 为 CJS，Vite/Rollup 解析不了 `export *` 转发链 | web 经 vite alias + tsconfig paths 直引 shared TS 源码（dist 仍供 NestJS 用） | 已解决 | M2 构建 |
| 2026-09-18 | 嵌入页白屏（`#embed-root` 为空） | vite `base './'` 使 bundle 在 `/embed/:id` 下按相对路径 404 | base 改为 `/`（服务固定挂根路径） | 已解决 | M2 联调 |
| 2026-09-18 | `locale=en` 时时间/刷新预设仍显示中文 | 预设 label 硬编码中文 | 新增 `timePresetOptions(locale)` / `refreshPresetOptions(locale)` | 已解决 | M3 i18n |
| 2026-09-18 | 浏览器 CDP 截图两次超时，无验收截图 | 当前环境 `Page.captureScreenshot` 超时（页面含多 canvas） | 改用 DOM 断言验收（canvas 数/文案/空态），截图项记为环境限制 | 已知限制 | M4 验收 |
| 2026-09-18 | 嵌入页与原生观感差距大（echarts 默认样式） | 原生时序图用 uPlot + 主题色板 + grafana 单位体系，我们用了默认样式 | 视觉对齐专项：换 uPlot 同引擎，色板/网格/token/格式化逐字复制（`signoz/{theme,colors,format}.ts`，`UplotChart.tsx`） | 已废弃（M4 回退自研 UI） | 视觉对齐 |
| 2026-09-19 | 嵌入页白屏 React #311（`Should have a queue`，useTranslation 内） | react-i18next 在 i18n 单例未就绪时提前 return（1 个 hook），就绪后走完整路径（5 个 hook）；动态 `import('ReactI18')` 让首次渲染落在未就绪分支，fetch 回包后的重渲染 hook 数量对不上 | 改静态导入（与原生 index.tsx 一致），单例渲染前就绪 | 已解决（代码随 vendor 回退移除，结论记档） | 100% 复刻 |
| 2026-09-19 | GridGraphs 挂载表象卡死，主线程无响应 | 误报：poisoned ego-browser tab（旧卡死页）污染后续所有观测 + stale bundle/tab 标题误读；真机复测正常渲染 | 单 space 隔离验证、看服务端日志 ground truth；AGENTS 已加单 TaskSpace 硬规则 | 已解决（方法论） | 100% 复刻 |
| 2026-09-19 | M4 决议：彻底回退自研 UI + 主题插件架构，`src/vendor/`（1300+ 文件）已删除 | 100% 复刻的依赖闭包/Provider 链/升级负担过高，且与多 theme 扩展目标冲突 | 删 `src/vendor/` + take-vendor/apply-patches/stubs；保留参考快照（可再造，不入库）；设计文档 §7 重写 | 已执行 | M4 决策 |
| 2026-09-19 | M5 自研 widget 查询 400 `unknown field "dataType" in query spec`（首个 panel 报错，其余正常） | `signoz/queryPayload` 把 widget 原样 `groupBy`（前端形态 `{key,dataType,type}`）直接透传，后端只要 API 形态 `{name,fieldDataType,fieldContext}` | 补 `mapGroupBy`/`mapSelectFields`（对照快照 `createBaseSpec`），`selectColumns→selectFields` 同改 | 已解决 | M5 联调 |
| 2026-09-19 | `pkill -f apps/api/dist/main.js` 后端口仍被占，新实例 EADDRINUSE，curl 打到旧进程（uptime 出卖） | 旧进程以绝对路径无后缀启动（`.../dist/main`），匹配串 `main.js` 未命中 | 先 `ps` 核对命令行再杀（必要时按 PID），`curl healthz` 看 uptime 确认是新进程 | 已解决 | 本地联调 |
| 2026-09-19 | 嵌入页 tooltip/图例出现 `{{mountpoint}}` 原文与 `__result_0` 内部名 | ① 公式 F1 的 legend 模板（`{{mountpoint}}`）未按 labels 替换；② response aggregation 自带后端内部 `alias='__result_0'`，我方优先级 alias 第一导致外泄 | 图例改按 `getLabelName`/`getLegend` 可观察行为：模板替换 → 单 label 取 bare value → legendMap → queryName；时序命名忽略 response alias | 已解决 | M5 打磨 |
| 2026-09-19 | 饼图分片显示 `A#0/B#0`、无中心总值，时序 tooltip 显示裸值 | scalar 对 pie 返回的是序列式（aggregations+series）而非列式，我方只解析 columns+data；tooltip 用 echarts 默认 formatter | scalar 双形态解析（列式→tables，序列式→series）；pie 按列名/series 名分片 + 中心总值 + 格式化 tooltip；时序 tooltip 自定 formatter（时间 + `formatValue`） | 已解决 | M5 打磨 |
| 2026-09-19 | 新看板变量下拉显示 id、取数全空（D1/D2 表格无数据） | 看板 JSON 的 variables 以 id 为键，我方误用记录 key，应用 `v.name`；另两个变量接口返回值包在 `data` 里，我方读了顶层 | 加 `normalizeVariables` 按名归一；`variables/query` 读 `data.variableValues`，`fields/values` 读 `data.normalizedValues`（兼容易 `values` 合并） | 已解决 | 多看板排查 |
| 2026-09-19 | D1 Pod状态（clickhouse_sql）恒为空 payload 被跳过 | 每个 widget 恒带 `promql/ch: [{query:''}]` 占位数组，我方按“数组存在性”分发，CH 被空 promql 占位吞掉 | 只按 `queryType` 分发（builder/promql/clickhouse_sql），占位空 query 照旧过滤 | 已解决 | 多看板排查 |
| 2026-09-19 | D1 变量依赖查询 400（`... = test` 非法 SQL） | 依赖变量代入查询文本时字符串未加引号（filter 中的 `$var` 由后端处理，只需管 SQL 文本预代入） | `formatValueForQuery` 字符串单引号包裹、数组展开为 `'a','b'` | 已解决 | 多看板排查 |
| 2026-09-19 | 图表溢出卡片（x 轴标签/底部图例被裁） | 固定 300px 高 + grid bottom 预留不足（40px 装不下轴标签+图例两行） | 卡片 body 改 flex 纵向、图表 flex 自适应 + ResizeObserver；grid `bottom:64 + containLabel`，legend bottom 留白 | 已解决 | 视觉打磨 |
| 2026-09-19 | 深色模式卡片/图表全白（`?mode=dark` 冷启动无效观感） | `ColorModeProvider` 包在 `TokensProvider` 内层，antd ConfigProvider 永远读到默认 light | 把 `TokensProvider` 移入 `EmbedApp` 内、包在 `ColorModeProvider` 里；main 仅保留 fatal 路径的 legacy token | 已解决 | 视觉打磨 |
| 2026-09-19 | 饼图中心总值偏上、压环上沿 | 叠加层用 `padding-bottom: 12%` 居中，但百分比 padding 按**宽度**解析（596px 卡片扣掉 71px），中心被顶到 36% | 改用 `height: 88%` 绝对定位（百分比 height 按父高度解析），与饼心 `center 44%` 精确对齐 | 已解决 | 视觉打磨 |
| 2026-09-19 | `@types/react@18.3` 下 antd icons 4.8 类型报错（`onPointerEnterCapture` 缺失） | antd icons v4 的 Icon 类型与新 JSX 类型不兼容 | legacy/shadcn 统一改 lucide 图标，删 `@ant-design/icons` 依赖 | 已解决 | shadcn 主题 |
| 2026-09-19 | shadcn 折线/柱状图无图例 | `LineChart/BarChart` 里只放了 Tooltip，漏了 `<Legend content>` | 补 `ChartLegendContent`（截图复验） | 已解决 | shadcn 主题 |
| 2026-09-19 | shadcn 下 40+ series 图例/tooltip 撑爆布局 | 图例全量换行、tooltip 全量列表（线程池面板） | 图例/tooltip 均收敛为前 12 项 + `+N`（`MAX_LEGEND_ITEMS`），tooltip 保持可读 | 已解决 | shadcn 打磨 |
| 2026-09-19 | Base UI Select 显示原始 value（`30m`）而非 label | portal 关闭时 items 卸载，`Select.Value` 取不到选中项文本 | 加 `displayValue` 由调用方显式传入展示文案 | 已解决 | shadcn 主题 |
| 2026-09-19 | shadcn 排版全塌：panel 全宽竖堆 | flex `width: calc(50% - 6px)` 只抵 12px gap 的一半逻辑，shadcn 24px gap 下两项 + gap 超宽换行再被 flex-grow 拉满 | 改 12 列 CSS grid（`span w`），gap 原生处理，换 gap 不再换行 | 已解决 | shadcn 回归 |
| 2026-09-19 | Base UI 下拉定位到左上角/盖住框体、交互近不可用 | Base UI v1 RC Positioner 定位不稳定（listbox `position: static` 落左上） | 回退 radix（此前截图验证可用）；图表本就 Recharts直用，与 radix/Base 无关，保持 shadcn 样式类 | 已解决 | shadcn 回归 |
| 2026-09-19 | 点击图表蓝色边框去不掉 | 焦点实际落在 svg 内 `<g>` 上，之前的 wrapper 级 CSS 盖不住 | 补 `.schn svg :focus { outline: none }`，真机点击验 `outline: none` | 已解决 | shadcn 回归 |
| 2026-09-19 | shadcn 排版二塌：panel 全宽竖堆（24px gap 下） | flex `width: calc(% - 6px)` 按 12px gap 写死，24px gap 下两项挤换行再被拉满 | 改 12 列 CSS grid（`span w` + 按 (y,x) 排序复刻控制台），gap 原生处理 | 已解决 | shadcn 回归 |
| 2026-09-19 | shadcn 按钮裸奔（2px outset 原生边框） | 不引 preflight 后原生 button 样式残留，toggle/ghost 项缺 `border-0` | toggle 项加 `border-0 bg-transparent`，ghost 同改，`.schn button` 补 `font: inherit` | 已解决 | shadcn 回归 |
| 2026-09-19 | recharts v3 Pie 不认 `center`（中心字偏上） | v3 只认 `cx/cy`，`center` 被静默忽略，饼心恒 50% | 改 `cx="50%" cy="44%"`，与 HTML 叠加层同源对齐 | 已解决 | shadcn 回归 |
| 2026-09-19 | shadcn 按钮裸奔（2px outset 原生边框、字比 label 大） | 不引 preflight 后 UA 样式残留；且 `font: inherit` 简写（无层）盖掉了 tailwind `text-xs` | 只补 `font-family: inherit`；toggle/ghost 项加 `border-0 bg-transparent` | 已解决 | shadcn 回归 |
| 2026-09-19 | day-picker 选中日期黑块吞字 | v10 把 selected 画在格子上，按钮保持深色字（类分属两元素） | `.schn [data-selected] > button` 反白 + 去底（light/dark 各一） | 已解决 | shadcn 打磨 |
| 2026-09-19 | 日历翻月箭头堆在右侧/飘到面板中部 | v10 的 nav 与 months 同级（非 caption 子级），`right-0` 堆叠、`top-1/2` 相对整面板居中 | nav 改 `absolute inset-x-0 top-0 h-9 justify-between`，与标题行等高两端对开 | 已解决 | shadcn 打磨 |
| 2026-09-19 | 日历月份箭头裸奔（outset 边框） | radix/rdp 导航按钮缺 `border-0`（同一 preflight 坑） | 补 `border-0 bg-transparent` | 已解决 | shadcn 打磨 |
| 2026-09-19 | 自定义浮层定位飘到左上、灰底只盖工具条 | 浮层放在有 `backdrop-blur` 的工具条内，`fixed inset-0` 以工具条为包含块 | 改 SigNoz 式一体 popover：快选网格 + 自定义同面板，锚定在时间按钮下，无 modal 无全屏灰底 | 已解决 | shadcn 打磨 |
