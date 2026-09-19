# PATCHES.md（参考快照使用说明 + 语义对照）

> `signoz-0.97.0/` 是 `take-snapshot.sh` 生成的只读参考快照（可再造，不入库），
> 仅供理解 SigNoz 0.97.0 查询语义，不参与构建、不逐字搬运（M4 评审结论，见设计文档 §5.2/§7）。
> 下表是 `src/signoz/`（各主题共用的数据契约层）对照快照实现的取舍记录。

| SigNoz 源文件 | 本仓库实现 | 说明 |
|---|---|---|
| `api/v5/queryRange/prepareQueryRangePayloadV5.ts` | `src/signoz/queryPayload.ts` | `mapPanelTypeToRequestType` 映射逐值一致；builder/formula/promql/clickhouse 信封结构一致；`start/end` 为毫秒；`formatTableResultForUI` 仅 table 置 true；`variables` 类型字段可选；`groupBy/selectColumns` 按 `createBaseSpec` 做前端→API 字段映射（`key→name` 等，直传会 400，见 bug-track） |
| `api/v5/queryRange/convertV5Response.ts` | `src/signoz/v5Response.ts` | `time_series`（results→series→labels/values）、`scalar`（columns+data）、`raw`、`distribution` 解析口径一致；scalar 双形态：列式→tables，序列式（pie/value 类）→series（对照原生 `aggregations?.length>0` 走时序分支）；时序图例按 `getLabelName`/`getLegend` 可观察行为（模板 `{{k}}` 按 labels 替换，空模板单 label 取 bare value），response 自带内部 `alias`（如 `__result_0`）必须忽略；列名优先级 alias > legend > expression（多聚合时不取 legend） |
| `constants/queryBuilder.ts PANEL_TYPES` | `src/signoz/panels.ts` | 枚举值逐字一致（`graph/value/table/list/trace/bar/pie/histogram/row`） |

历史记录：M2–M3 曾走“同契约独立实现”路线（上表即当时对照），M3 后半转向 100% 复刻（`src/vendor/`，已删除），M4 决议彻底回退到自研 UI + 主题插件架构。旧实现已随 vendor 一并移除，不保留。
