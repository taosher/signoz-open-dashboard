# TODOS.md

> 唯一待办列表。规则：只有“代码完成 + 测试通过”后才可勾选；设计变更先改 `docs/product-tech-design-v1.0.md`。

- [x] M0：评审并冻结 `docs/product-tech-design-v1.0.md`（确认 URL 全参、代理矩阵、裁剪清单无异议）
- [x] M1：monorepo 空架（`apps/api` + `apps/web` + `packages/shared`）+ NestJS `/api/signoz/*` 透传 + `/healthz` + `/metrics`（本地 dev/build/test 全绿）
- [x] M1：`curl` 代理矩阵验收全绿（dashboards GET 通、query_range v3/v4/v5 通、写接口 403；真后端 `v0.97.0` 联调通过）
- [ ] M1-延后：单镜像 `Dockerfile` 构建验证（用户要求先不构建镜像，Dockerfile/compose 已写，未验证）
- [x] M2：`third_party/signoz-0.97.0` 快照 + `PATCHES.md` + 查询语义映射表（设计文档 §7.1，同契约独立实现）
- [x] M2：极简工具条 + UTC + light 默认 + `replaceState` + 单 Dashboard（`019ca330-…`）浏览器实测 4 图渲染
- [x] M3：变量全量（`var-*` 最高优先级）+ annotations 预留 + 全 widget 类型 + iframe-resizer 子端 + Chrome108 target
- [x] M3：友好空态 + Retry（401/404/502 可区分）+ 日志脱敏审计（无明文 Key）+ `/metrics`
- [x] M4：`docker-compose` 示例 + 验收表回填设计文档 §11（截图改 DOM 断言，原因见 bug-track）
