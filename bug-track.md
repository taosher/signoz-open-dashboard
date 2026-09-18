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
| 2026-09-18 | 嵌入页与原生观感差距大（echarts 默认样式） | 原生时序图用 uPlot + 主题色板 + grafana 单位体系，我们用了默认样式 | 视觉对齐专项：换 uPlot 同引擎，色板/网格/token/格式化逐字复制（`signoz/{theme,colors,format}.ts`，`UplotChart.tsx`） | 已解决 | 视觉对齐 |
