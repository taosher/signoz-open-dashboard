# TODOS.md

> The only TODO list. Rule: a task may only be checked off after "code complete + tests pass"; design changes must update `docs/product-tech-design.md` first.
> M4 decision: roll back completely to the self-built UI + theme plugin architecture (see design doc §7). The old M2–M4 implementation and the 100% replica route (`src/vendor/`) have been deleted and archived, and will no longer be executed.
> Fixed acceptance dashboards (compare the SigNoz console at `http://192.168.10.2:30303/dashboard/:id` against this project's dev server at `:5173/embed/:id`):
> `019ca330-42b0-7a60-b882-1e607e047942` (System Overview (系统资源总览), smoke) / `019c4bb6-d2ee-7b30-9423-67d3da2c9565` (K8s, QUERY variables + table + CH) / `019c4bb6-da7f-7ad7-80d0-c79de93e904d` (Postgres, DYNAMIC variables) / `019c4bb6-d24f-7213-a251-22e6f87dff5c` (ES, formula)

- [x] M0: review and freeze `docs/product-tech-design.md`
- [x] M1: empty monorepo skeleton + NestJS `/api/signoz/*` passthrough + `/healthz` + `/metrics` (local dev/build/test all green)
- [x] M1: `curl` proxy-matrix acceptance all green (integration against the real `v0.97.0` backend passed)
- [ ] M1-deferred: single-image `Dockerfile` build verification (Dockerfile/compose written, not yet verified)
- [x] M4-docs: design-doc rewrite (§4.1 theme=`legacy`, §5.1/§5.2, §7 theme plugin architecture, §11/§12/§13) + AGENTS/TODOS/bug-track/PATCHES sync
- [x] M5: `apps/web` redo — `core/` (routing/auth/data-fetching/time-variables/replaceState/empty-state mapping) + `signoz/` (query semantics) + `themes/registry + legacy` (full panel coverage, `?theme=` unknown-value fallback); smoke-dashboard browser rendering acceptance (2026-09-19: all 4 panels rendered, wrong-key 401 / wrong-ID 404 / unknown-theme fallback all passed, see the bug-track groupBy mapping pitfall)
- [x] M5: clean up `apps/web` leftovers (`src/embed/*`, `src/shims/`, unused deps in `package.json`) and restore `pnpm build` / `pnpm test` to green (2026-09-19: `pnpm build/test/typecheck` + API e2e 7/7 all green)
- [ ] M6: iframe-resizer, Chrome108, offline drill, second dashboard (variables+table), `?theme=<unknown>` fallback (`shadcn`) unit test, docs wrap-up (2026-09-19 progress: D1 K8s / D2 Postgres / D3 ES dashboards all pass — QUERY/DYNAMIC variable engine, CH panels, dual-shape scalar; `?mode=light/dark` landed)
- [x] M7: TanStack Query v5 migration (replacing the hand-written `useWidgetQuery`/`useVariables` polling with SWR updates, dedup, and placeholder-driven no-flash loading) (2026-09-19: `?theme=legacy/shadcn` dual-theme verification, no flash on theme switch + background "updating" indicator)
- [x] M7: QueryClient wiring (`refetchOnWindowFocus/Reconnect` off, exponential-backoff `retry`; `queryKey: ['widget', dashboardId, widget.id, startMs, endMs, varsHash]`; variables `staleTime` at minute level, panels at second level)
- [x] M7: UI state migration (`placeholderData: keepPreviousData` keeps the old chart + `isFetching` soft hint replaces Spin; `isError && !data` keeps the ErrorState + Retry)
- [x] M8: shadcn theme creation (`?theme=shadcn`: tailwind + Recharts + lucide; Tokens/Toolbar/WidgetCard/ErrorState quartet; four-dashboard dual-theme regression passed) (2026-09-19)
- [ ] M8: shadcn theme polish (work through the pixel-diff convergence items against the console one by one, see the visual-polish rows in bug-track)
- [ ] M7: four-dashboard regression (SWR no-flash switch verification, polling-advance verification, offline-retry verification) + bundle-size confirmation (devtools excluded from the bundle) (2026-09-19 progress: four-dashboard dual-theme DOM/screenshot regression passed, no-flash verified; offline retry still to be drilled; bundle 2.59MB / 825KB-gzip, see bug-track)
