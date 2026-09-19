# TODOS.md

> 唯一待办列表。规则：只有“代码完成 + 测试通过”后才可勾选；设计变更先改 `docs/product-tech-design.md`。
> M4 决议：彻底回退到自研 UI + 主题插件架构（见设计文档 §7）。M2–M4 旧实现与 100% 复刻路线（`src/vendor/`）已删除归档，不再执行。
> 固定验收看板（SigNoz 控制台 `http://192.168.10.2:30303/dashboard/:id` 与本项目 dev `:5173/embed/:id` 对比测试）：
> `019ca330-42b0-7a60-b882-1e607e047942`（系统资源总览，冒烟）/ `019c4bb6-d2ee-7b30-9423-67d3da2c9565`（K8s，QUERY 变量+table+CH）/ `019c4bb6-da7f-7ad7-80d0-c79de93e904d`（Postgres，DYNAMIC 变量）/ `019c4bb6-d24f-7213-a251-22e6f87dff5c`（ES，公式）

- [x] M0：评审并冻结 `docs/product-tech-design.md`
- [x] M1：monorepo 空架 + NestJS `/api/signoz/*` 透传 + `/healthz` + `/metrics`（本地 dev/build/test 全绿）
- [x] M1：`curl` 代理矩阵验收全绿（真后端 `v0.97.0` 联调通过）
- [ ] M1-延后：单镜像 `Dockerfile` 构建验证（Dockerfile/compose 已写，未验证）
- [x] M4-文档：设计文档改写（§4.1 theme=`legacy`、§5.1/§5.2、§7 主题插件架构、§11/§12/§13）+ AGENTS/TODOS/bug-track/PATCHES 同步
- [x] M5：`apps/web` 重做——`core/`（路由/鉴权/取数/时间变量/replaceState/空态映射）+ `signoz/`（查询语义）+ `themes/registry + legacy`（全量 panel，`?theme=` 未知值回退）；冒烟 Dashboard 浏览器渲染验收（2026-09-19：4 panels 全渲染，错 Key 401/错 ID 404/未知 theme 回退均通过，见 bug-track groupBy 映射坑）
- [x] M5：清理 `apps/web` 残留（`src/embed/*`、`src/shims/`、`package.json` 无用依赖）并恢复 `pnpm build` / `pnpm test` 全绿（2026-09-19：`pnpm build/test/typecheck` + API e2e 7/7 全绿）
- [ ] M6：iframe-resizer、Chrome108、断网演练、第二看板（variables+table）、`?theme=未知值` 回退单测、文档收尾（2026-09-19 进展：D1 K8s/D2 Postgres/D3 ES 三看板已通——QUERY/DYNAMIC 变量引擎、CH 面板、双形态 scalar；`?mode=light/dark` 已落地）
- [x] M7：TanStack Query v5 改造（替代手写 `useWidgetQuery`/`useVariables` 轮询，实现 SWR 更新、去重、placeholder 去 loading 闪）（2026-09-19：`?theme=legacy/shadcn` 双主题验证，切换时间无闪 + 后台“更新中”）
- [x] M7：QueryClient 接入（`refetchOnWindowFocus/Reconnect` 关，`retry` 指数退避；`queryKey: ['widget', dashboardId, widget.id, startMs, endMs, varsHash]`；变量 `staleTime` 分钟级、面板秒级）
- [x] M7：UI 状态迁移（`placeholderData: keepPreviousData` 保旧图 + `isFetching` 弱提示替代 Spin；`isError && !data` 保持 ErrorState + Retry）
- [x] M8：shadcn 主题创建（`?theme=shadcn`：tailwind + Recharts + lucide；Tokens/Toolbar/WidgetCard/ErrorState 四件套；四看板双主题回归通过）（2026-09-19）
- [ ] M8：shadcn 主题打磨（与控制台像素级 diff 收敛项逐项销账，见 bug-track 视觉打磨行）
- [ ] M7：回归四看板（SWR 无闪切验证、轮询推进验证、断网重试验证）+ 体积确认（devtools 不进包）（2026-09-19 进展：四看板双主题 DOM/截图回归通过，无闪切已验；断网重试待演练；包体积 2.59MB/825KB-gzip，见 bug-track）
