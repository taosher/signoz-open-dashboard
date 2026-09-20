# signoz-open-dashboard Product and Technical Design v1.0

- Status: Ready for Review
- Baseline: SigNoz `v0.97.0` (`6c59b5405 chore(release): bump to v0.97.0`), local code at `~/develop/open-source/signoz`
- Test backend: `http://192.168.10.2:30303` / `truth-ai@truth-ai.com.cn` / `ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=` / Dashboard `019ca330-42b0-7a60-b882-1e607e047942` (System Overview (系统资源总览), 4 panels, v5)
- Verified: `GET /api/v1/dashboards/:id` with the `SIGNOZ-API-KEY` header succeeds; no changes to SigNoz Go code are needed.

---

## 1. Background, Goals, Non-Goals

### 1.1 Background
The SigNoz open-source edition once had dashboard sharing/embedding, later narrowed to the commercial edition. State of open-source `v0.97.0`:

- `ShareModal.tsx` only keeps Copy JSON / Download JSON, with no public links.
- `ROUTES.DASHBOARD = /dashboard/:dashboardId` strongly depends on login (`providers/Dashboard/Dashboard.tsx:274 enabled: ... && isLoggedIn`).
- The backend dashboard-read API in `pkg/query-service/app/http_handler.go:520-525` requires `am.ViewAccess` (JWT or `SIGNOZ-API-KEY`), and `pkg/query-service/app/server.go:179` already mounts `middleware.NewAPIKey(... ["SIGNOZ-API-KEY"] ...)` globally, i.e. an API key can read dashboards + queryRange. This is the legitimate footing of this project.

### 1.2 Goals (P0)
Build a standalone service so any third-party site can embed a read-only dashboard visually consistent with the SigNoz console using a single iframe line:

```html
<iframe
  src="https://embed.example.com/embed/019ca330-42b0-7a60-b882-1e607e047942?apiKey=ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=&from=now-6h&to=now&theme=shadcn&locale=zh"
  style="width:100%;border:0"
  allowfullscreen>
</iframe>
```

Callers assemble the URL themselves; no admin page is needed.

### 1.3 Non-Goals (explicitly out of scope)
- No user system, SSO, RBAC, or key issuance/rotation. Key risk is on the user.
- No dynamic switching across multiple SigNoz backends. `SIGNOZ_BASE_URL` is a single fixed env value, preventing SSRF.
- No domain allowlist. Fully public: anyone holding the link can view.
- No dashboard editing/creation/deletion/locking/alert management.
- The first version has no dashboard list page, playlists, or snapshot export.

---

## 2. Terms and Roles

| Term | Definition |
|---|---|
| Embed URL | The `/embed/:dashboardId?...` address exposed by this service, containing the SigNoz dashboard ID + optional apiKey + display params |
| EffectiveApiKey | `URL.apiKey ?? env.SIGNOZ_API_KEY`; missing means unauthorized |
| Upstream | The SigNoz Query Service (0.97.0) pointed to by `SIGNOZ_BASE_URL` |
| Viewer | The end viewer on a third-party site, with no SigNoz account |
| Owner | The person who builds dashboard charts in the SigNoz console |
| Pixel parity | Under the same dashboard ID + time range + variables, chart type, data, tooltip, legend, and formatting match the console; only editing chrome may be trimmed, chart libraries may not be rewritten |

User stories:

- US1 Viewer: opening the iframe shows the charts immediately; can switch time/variables/refresh/fullscreen, view tooltips, drill into Logs/Traces (read-only), and never sees edit buttons.
- US2 Owner: annotation release markers must carry over, otherwise breakpoints cannot be explained; alert management and the lock switch must not appear.
- US3 Ops: on wrong key / wrong ID / dead backend, show a distinguishable friendly empty state + Retry + requestId instead of a blank page / 500 stack.

Alert / Annotation / Lock decision: Phase 1 = hide Alerts + hide Lock + show Annotations read-only (`?annotations=true/false`, default true).

---

## 3. Overall Architecture

```
Third-party site
  │ <iframe src=".../embed/:id?...">
  ▼
┌─────────────────────────────────────────┐
│ signoz-open-dashboard (single Docker image)   │
│  ┌──────────────┐   ┌─────────────────┐  │
│  │ apps/web     │──▶│ apps/api NestJS │  │
│  │ React18+antd │   │ :8080           │  │
│  │ /embed/:id   │   │ /api/signoz/*───┼──┼──▶ Upstream SigNoz 0.97.0
│  │ minimal toolbar│  │ /healthz        │  │     SIGNOZ-API-KEY passthrough
│  │ +GridGraphs  │   │ /metrics        │  │
│  └──────────────┘   └─────────────────┘  │
│  NestJS ServeStatic serves web/dist directly  │
└─────────────────────────────────────────┘
```

- Monorepo: `apps/api` (NestJS) + `apps/web` (self-built frontend with the theme plugin architecture, see §7) + `packages/shared` (URL param parsing, types, error codes).
- Single-container deployment: `web build → api build → node runtime serve`, no Nginx; NestJS serves static files directly.
- Stateless passthrough: NestJS caches no query results and stores no keys; it only injects headers + timeouts + log redaction + normalized errors.
- Frontend singleton: one iframe renders exactly one dashboard at route `/embed/:dashboardId`.

Data flow:

1. Browser `GET /embed/:id?apiKey=...&from...` → NestJS returns the static HTML.
2. Web parses the URL in memory (`packages/shared/parseEmbedParams`) and stores `EmbedAuthContext { dashboardId, apiKeyMemory }`, never writing to localStorage.
3. All data requests go to same-origin `POST/GET /api/signoz/...`; the web interceptor attaches `x-embed-api-key` (the in-memory value, omitted when absent).
4. NestJS takes `x-embed-api-key ?? env.SIGNOZ_API_KEY`, sets the `SIGNOZ-API-KEY` header when forwarding upstream, strips the inbound Authorization, and returns the response as is.

---

## 4. Product Design

### 4.1 URL Spec (build the full set in v1)

Base: `{EMBED_ORIGIN}/embed/:dashboardId`

Time params reuse SigNoz native names (`DateTimeSelectionV2` recognizes them directly, zero adaptation): `relativeTime` (e.g. `30m`, the default) or `startTime` + `endTime`. Callers may keep using the legacy style `from=now-30m&to=now`; the entry point translates it once before mount into native params via `replaceState`.

| Param | Example | Required | Default | Notes |
|---|---|---|---|---|
| `apiKey` | `?apiKey=ecsO...` | No | `env.SIGNOZ_API_KEY` | Overrides the default. Priority: URL > env. Missing yields the 401 empty state |
| `relativeTime` / `startTime`+`endTime` | `30m` or epoch | No | `30m` | Native param names; `from/to` translated for compatibility. Does not follow the dashboard saved time |
| `theme` | `shadcn` / `legacy` | No | `shadcn` | See the theme registry in §7.2; unknown values fall back to `shadcn`; each theme may use a different component library |
| `mode` | `light` / `dark` | No | `light` | Color scheme (orthogonal to theme, see §7.4-5); unknown values fall back to `light` |
| `locale` | `zh` / `en` | No | Follows the theme default | Language is implemented by the active theme (legacy provides a zh/en toolbar switch, see `localeControl`); core does not dictate it |
| `refresh` | `off` / `30s` / `1m` / `5m` | No | Inherits the dashboard saved value | Maximum clamping allowed at `>=10s` to prevent abuse |
| `annotations` | `true` / `false` | No | `true` | Reserved (open-source 0.97.0 has no upstream API, so no data source yet) |
| `var-<name>` | `?var-env=prod` | No | Dashboard default | URL has the highest priority, overriding dashboard defaults + localStorage |
| `title` / `toolbar` | `?title=false&toolbar=false` | No | `true` | Minimal-toolbar visibility, handy for fullscreen video walls |
| `timeControl` / `refreshControl` / `modeControl` / `fullscreenControl` / `localeControl` | `show` / `hidden` / `disabled` | No | `show` | Three states per control: `show` (default, usable), `hidden` (not rendered), `disabled` (grayed out); `toolbar=false` hides the whole bar |
| `fullscreen` | `?fullscreen=true` | No | `false` | Enter fullscreen directly (auto-enter after load; the toolbar button toggles between fullscreen and exit) |

- All param changes sync back to the address bar via `history.replaceState` (no push, no history pollution).
- `dashboardId` is a SigNoz UUID v7 (e.g. `019ca330-...`); an illegal format goes directly to the 404 empty state without hitting upstream.

iframe-resizer (`davidjbradshaw/iframe-resizer` v5):

Parent page:

```html
<script src="https://cdn.jsdelivr.net/npm/@iframe-resizer/parent@5"></script>
<iframe id="signoz-embed" src="..."></iframe>
<script>iframeResize({ license:'GPLv3', heightCalculationMethod:'lowestElement' }, '#signoz-embed')</script>
```

Child page (apps/web): import `@iframe-resizer/child`; postMessage automatically on content-height changes. Degradation: when the parent does not import it, scroll internally without errors.

### 4.2 Page Structure: minimal toolbar (SigNoz TopNav is not kept)

```
┌────────────────────────────────────────────────┐
│ [Title System Overview (系统资源总览)] [vars...] [time 6h] [refresh] [⛶] │
├────────────────────────────────────────────────┤
│  GridGraphs (react-grid-layout, as is)          │
│  ┌──────────┐  ┌──────────┐                   │
│  │ graph    │  │ pie      │  ...up to dozens   │
│  └──────────┘  └──────────┘                   │
└────────────────────────────────────────────────┘
```

- Kept (viewing): time picker (incl. CustomTimePicker), AutoRefresh, variable dropdowns (incl. search), widget fullscreen, legend toggle, tooltip, View Query (read-only), View Logs/Traces drill-down links, CSV/PNG download (when the original component provides it), annotation overlay.
- Trimmed (editing): `Add Panel`, `Edit`, `Clone`, `Delete`, `Dashboard Settings`, `Configure`, `Lock/Unlock`, `Alerts` tab, `Share JSON` edit state, `Save Layout` (grid static=true).
- Timezone: forced UTC. `providers/Timezone` defaults to `UTC`; the switcher is hidden or shows `UTC` read-only.

### 4.3 Full Widget Support

0.97.0 `types/api/dashboard/getAll` panelTypes: `graph(timeseries)`, `table`, `list`, `pie`, `bar`, `histogram`, `value`, `worldmap` (if present) + `row` grouping. Strategy: no allowlist; reuse the `GridGraphs/GridCard` render branches directly. Acceptance is based on the test dashboard plus one more dashboard covering table/list/value/variables.

### 4.4 Browser and Performance Baseline

- Baseline: Chrome >=108; latest Edge/Safari best-effort. No webpack/babel downgrade; keep SigNoz `webpack.config.prod.js + babel-preset-react-app`.
- Performance: test dashboard has 4 panels; target "up to dozens of panels first paint <5s (intranet)". NestJS has no cache; timeouts are `30s` (queryRange) / `10s` (dashboard meta), with frontend `AbortSignal` cancellation.

---

## 5. Technical Overview

### 5.1 Repo Layout (monorepo)

```
signoz-open-dashboard/
  pnpm-workspace.yaml
  apps/
    api/  # NestJS 10 + pino + prom-client + http-proxy
      src/
        main.ts  # 8080, ServeStatic web/dist, helmet CSP frame-ancestors *
        config/env.validation.ts
        proxy/signoz-proxy.controller.ts  # /api/signoz/* full passthrough
        proxy/signoz-proxy.service.ts     # injects SIGNOZ-API-KEY
        observability/ # logging interceptor redaction, metrics controller
    web/  # standalone Vite+React embed app (theme plugin architecture, see §7)
      third_party/ # take-snapshot.sh (reference-snapshot generator) + PATCHES.md (semantic comparison)
      src/  # core/ + signoz/ + themes/ (see §7.1)
  packages/shared/
    embedParams.ts  # parse/serialize/validate
    errors.ts       # EMBED_xxx error codes
  website/  # marketing site + docs (isolated pnpm project, vinext + Magic UI, see §9.2)
    app/  # / (intro), /docs (usage), /design (principles)
    pnpm-workspace.yaml  # nested workspace root: website is NOT part of the root workspace
  .github/workflows/docker-publish.yml  # image build + Docker Hub push (see §9.1)
  Dockerfile  # multi-stage single image
  docker-compose.yml
```

`website/` is intentionally isolated from the root pnpm workspace (`pnpm-workspace.yaml`
matches only `apps/*` and `packages/*`), so the embedding runtime's install/build/test gates
are unaffected and the single Docker image never contains the marketing site.

Node: `20 LTS` (compatible with SigNoz `engines >=16.15`, pinned to 20).

### 5.2 Version Pinning

- `apps/web/third_party/signoz-0.97.0/` is the read-only reference snapshot of SigNoz `v0.97.0` (reproducible via `take-snapshot.sh`, not committed), used only for query-semantics comparison, never built and never copied verbatim. M4 review decision: the 100% replica route is fully abandoned (its verbatim-copy dependency closure and provider-chain cost was too high and conflicted with the theme-extension goal) in favor of the self-built UI + theme plugin architecture.
- Frontend dependencies are declared per theme (legacy, see §7.3); the build still uses Vite.
- SigNoz backend APIs are pinned to 0.97.0 (`/api/v3|v4|v5/query_range`, `POST /api/v2/variables/query`, `POST .../substitute_vars`); unknown fields pass through without validation.

---

## 6. Backend (NestJS) Design

### 6.1 Config (single-backend env)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SIGNOZ_BASE_URL` | Yes | `http://192.168.10.2:30303` (example) | The only upstream; URL override is not allowed |
| `SIGNOZ_API_KEY` | No | Empty | Default key, overridable by the URL `apiKey` |
| `PORT` | No | `8080` | NestJS listen port |
| `UPSTREAM_TIMEOUT_MS` | No | `30000` | queryRange; meta APIs use 10000 |
| `MAX_REFRESH_SECONDS_FLOOR` | No | `10` | refresh <10s is clamped |
| `LOG_LEVEL` | No | `info` | pino |
| `CORS_ORIGIN` | No | `*` | Fully public |

Startup validation: a non-http(s) `SIGNOZ_BASE_URL` crashes immediately; an empty `SIGNOZ_API_KEY` only warns.

### 6.2 Proxy Matrix (all via NestJS passthrough; the frontend never talks upstream directly)

Controller: `ALL /api/signoz/*` → `stripPrefix → SIGNOZ_BASE_URL + path + query`, preserving method/body/streaming, injecting `SIGNOZ-API-KEY: <effective>`, deleting inbound `authorization`/`cookie`, returning the response as is with an added `x-embed-request-id`.

| Upstream | Method | Needed for embed | Proxy policy |
|---|---|---|---|
| `/api/v1/dashboards/:id` | GET | Yes (first paint) | Passthrough, requires View. PUT/POST/DELETE/`/lock` always 403 `EMBED_READONLY` |
| `/api/v3/query_range`, `/query_range/format` | POST | Yes (legacy panel compat) | Passthrough |
| `/api/v4/query_range` | POST | Yes | Passthrough |
| `/api/v5/query_range` | POST | Yes (primary, `getQueryRangeV5`) | Passthrough |
| `/api/v5/substitute_vars` | POST | Yes | Passthrough |
| `/api/v2/variables/query` | POST | Yes (QUERY-type variable candidates) | Passthrough |
| `/api/v1/fields/values` | GET | Yes (DYNAMIC-type variable candidates, `normalizedValues`) | Passthrough |
| `/api/v1/version`, `/api/v1/features` | GET | Weak | Passthrough or local stub |
| `/api/v1/rules`, `/alerts`, `/channels`, `/user/*`, `/org/*`, `/invite/*` | * | No | 403 `EMBED_BLOCKED`, never proxied |
| All other unknown `/api/*` | * | No | Default 403 deny-list |

Basis: `frontend/src/api/index.ts` has five axios instances `apiV1/V2/V3/V4/V5` with `baseURL = ENVIRONMENT.baseURL + apiVx`; after the change all use `baseURL = /api/signoz` + routing by path prefix, while upstream paths stay `/api/vX/...` unchanged.

Auth middleware pseudocode:

```ts
effectiveKey = req.headers['x-embed-api-key'] as string
  ?? req.query.apiKey as string
  ?? env.SIGNOZ_API_KEY;
if (!effectiveKey) throw 401 EMBED_MISSING_API_KEY;
proxyReq.setHeader('SIGNOZ-API-KEY', effectiveKey);
proxyReq.removeHeader('authorization','cookie');
```

### 6.3 Observability (everything except the key)

- Logs (pino JSON): `requestId, method, upstreamPath (query redacted), dashboardId, upstreamStatus, durationMs, bytes, userAgent, referer, effectiveKeySource(url|env|header), effectiveKeyHash(first 8 chars of sha256)`. Never log the plaintext key.
- `GET /healthz` → `{ status:'ok', signozReachable:bool, signozVersion:string, uptime }` (probes upstream `/api/v1/version`).
- `GET /metrics` (prom-client): `http_requests_total{route,status}`, `proxy_upstream_duration_seconds`, `proxy_upstream_errors_total{reason}`.
- Normalized errors: upstream 401 → `EMBED_INVALID_API_KEY`; 404 → `EMBED_DASHBOARD_NOT_FOUND`; timeout/ECONNREFUSED → `EMBED_UPSTREAM_UNAVAILABLE`; all carry `requestId`.

### 6.4 Error Codes (frontend empty-state mapping)

| code | http | copy | Retry |
|---|---|---|---|
| `EMBED_MISSING_API_KEY` | 401 | Missing API key: add `?apiKey=` to the URL or configure the server default | No |
| `EMBED_INVALID_API_KEY` | 401 | API key invalid or without view permission | Yes |
| `EMBED_DASHBOARD_NOT_FOUND` | 404 | Dashboard does not exist or was deleted | No |
| `EMBED_UPSTREAM_UNAVAILABLE` | 502 | SigNoz backend unreachable/timed out | Yes |
| `EMBED_READONLY / EMBED_BLOCKED` | 403 | The embed page is read-only; this operation is unavailable | No |

---

## 7. Frontend (apps/web) Design: theme plugin architecture (M3 review decision, self-built UI as the first principle)

> Direction: abandon the 100% replica of the SigNoz UI. The frontend uses SigNoz data contracts (v5 query semantics); the render layer is fully self-built.
> `apps/web/third_party/signoz-0.97.0/` is only a read-only reference snapshot (generated by `take-snapshot.sh`, reproducible, not committed) for query-semantics comparison; it is not part of the build and is never copied verbatim.

### 7.1 Layers: core (stable) + themes (pluggable)

```
apps/web/src/
  core/        # theme-agnostic: routing (/embed/:id), auth (in-memory key), data hooks,
               # time/variable/refresh state, replaceState, iframe-resizer, empty and error mapping
  signoz/      # SigNoz data-contract implementation: v5 payload assembly, response parsing, panel/requestType mapping,
               # unit formatting (logically consistent with the snapshot, not line-identical)
  themes/
    registry.ts      # theme registry: name → ThemeModule; unknown names fall back to shadcn
    shadcn/          # default theme (?theme= empty/shadcn): tailwind + Recharts-based self-built UI
    legacy/          # secondary theme (?theme=legacy): antd + echarts-based self-built UI
    <future>/        # future themes: any component library, only needs the ThemeModule contract
```

### 7.2 ThemeModule Contract (the only interface a new theme must implement)

```ts
interface ThemeModule {
  name: string;                       // e.g. 'shadcn', matching the ?theme= value
  TokensProvider: ComponentType;      // theme tokens (CSS variables / ConfigProvider / echarts theme, etc.)
  Toolbar: ComponentType<ToolbarProps>;   // minimal toolbar (title+time+refresh+variables+fullscreen); shapes may differ per theme
  WidgetCard: ComponentType<WidgetProps>; // render dispatch by panelTypes (graph/table/list/pie/bar/histogram/value)
  ErrorState: ComponentType<ErrorProps>;  // EMBED_ error-code empty states + Retry + requestId
}
```

- `ToolbarProps` may extend optional fields (e.g. `variableOptions` candidate resolution, `mode/onModeChange` scheme switching); new themes may ignore them; the required contract is unchanged.
- `WidgetProps.refreshing` is an optional extension (soft hint while background fetching); ignored by default.
- core depends only on this contract, never on a theme's concrete component library; a new theme must not modify core (except one registry line).
- Each theme carries its own dependencies (e.g. legacy uses antd/echarts, shadcn uses tailwind/Recharts), never polluting each other; the build bundles everything, and `?theme=` selects at runtime.
- Dashboard-level behavior (UTC, read-only grid, variable priority, replaceState, keys in memory only) is guaranteed by core and must not be broken by any theme.

### 7.3 legacy Theme (secondary, in P0 scope)

- Component library: antd (5.x, no more major upgrades once pinned) + echarts-based self-built charts; visuals should approach the light SigNoz console, without pixel-level alignment; `?mode=dark` switches to the antd dark algorithm + dark chart foreground, light is the default.
- Reuses the `src/signoz/` query semantics (requestType mapping, builder/formula/promql/CH envelopes, millisecond times, table formatting switch; legend priority alias > legend > expression).
- Kept (viewing): time picker, auto-refresh, variable display, widget fullscreen / CSV download, tooltip, legend toggle. Trimmed (editing): Add Panel/Edit/Clone/Delete/Settings/Lock/Alerts.
- Timezone forced to UTC; Annotations: open-source 0.97.0 has no upstream API, so `?annotations=` is only parsed and reserved.

### 7.4 Key Behaviors (guaranteed by core, theme-agnostic)

1. **Login state**: no JWT; `apiKey(URL) ?? env.SIGNOZ_API_KEY`, stored in memory, never written to localStorage.
2. **Requests**: always same-origin `/api/signoz/*`, with the interceptor attaching `x-embed-api-key` (omitted when absent).
3. **Routing**: only `/embed/:dashboardId`.
4. **Time/variables**: default `now-30m~now` UTC; `var-*` has the highest priority; changes write back via `replaceState` (never writing back the env default key). The time picker offers quick ranges + custom start/end (RangePicker down to seconds); the toolbar only shows UTC time with no timezone switch. Variables are always normalized by `name` (dashboard JSON keys by id, `name` wins); QUERY types resolve candidates via `/api/v2/variables/query`, DYNAMIC types via `/api/v1/fields/values`; with no historic selection, multi-select defaults to all and single-select to the default or first candidate.
5. **Theme/language/color scheme**: `?theme=shadcn` by default (unknown values fall back to shadcn); `?mode=light/dark` defaults to light (unknown values fall back to light), provided by core via context and expressed by each theme; language follows the theme implementation (each theme toolbar offers a zh/en switch via `localeControl`), core does not dictate it.
6. **Read-only grid**: not draggable; `?annotations=` reserved.
7. **iframe-resizer child**: wired once in core.
8. **Error pages**: core maps per the §6.4 codes; themes only handle stylistic expression.

### 7.5 Upgrade Strategy (pin the 0.97.0 APIs, do not follow frontend versions)

- Backend APIs are pinned to 0.97.0 (`/api/v3|v4|v5/query_range`, `POST /api/v2/variables/query`, `POST .../substitute_vars`); unknown fields pass through without validation.
- The reference snapshot is only for newcomers learning the query semantics; later SigNoz frontend changes are unrelated to this repo and need no patch merging.

### 7.6 shadcn Theme (default, `?theme=shadcn`)

- Component library: tailwind (preflight off, does not pollute legacy) + Recharts (against `ui.shadcn chart`: ChartContainer composition + CSS-variable palette) + Base UI primitives (Select/Popover/ToggleGroup/Checkbox, same family as the charts) + lucide icons;
- Data fetching / variables / legend / unit semantics share `core/` + `signoz/` with legacy; only the render layer differs; color scheme likewise comes from the core context (`.schn-dark` class variant).

---

## 8. Shared Package (packages/shared)

- `parseEmbedParams(search)` + validation (UUID, `theme` registry names, `mode`, `locale`, refresh regex, control three-states `show/hidden/disabled`).
- `serializeEmbedParams` (for replaceState; when the input carries a key it is kept, otherwise the env default key is never appended, avoiding leaks of the server-side default key).
- `EmbedError { code, httpStatus, requestId, message }` types shared by frontend and backend.

---

## 9. Deployment and Runtime

Docker (single image; verified 2026-09-20: `/healthz` 200, `/embed/:id` 200, asset 200, write 403):

```dockerfile
FROM node:20-slim AS webbuild
# COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json + all workspace manifests
# pnpm install --frozen-lockfile --filter @signoz-open-dashboard/web...
# COPY packages/shared + apps/web; pnpm --filter @signoz-open-dashboard/web build (no placeholder fallback)
FROM node:20-slim AS apibuild
# same manifest/lockfile install for @signoz-open-dashboard/api...
# build packages/shared, then apps/api; pnpm --filter @signoz-open-dashboard/api deploy --prod /out
# inject the workspace dependency: /out/node_modules/@signoz-open-dashboard/shared
FROM node:20-slim AS runtime
ENV NODE_ENV=production PORT=8080
COPY --from=apibuild /out ./
COPY --from=webbuild /app/apps/web/dist ./web-dist
CMD ["node","dist/main.js"]
```

The runtime directory is produced by `pnpm deploy --prod` (self-contained production `node_modules`);
the earlier raw `node_modules` copy is not runnable because pnpm links package dependencies in
`apps/api/node_modules`. The web build is not optional: a failed frontend build fails the image
instead of shipping a placeholder page.

`compose` example: `embed: image: signoz-open-dashboard:0.97.0-embed.1; env: SIGNOZ_BASE_URL=http://192.168.10.2:30303, SIGNOZ_API_KEY=...; ports: 8080:8080`.

### 9.1 CI: Docker image publish to Docker Hub (`.github/workflows/docker-publish.yml`)

- Triggers: push of a `v*` tag (release) and manual `workflow_dispatch` (`push` input, default true).
- Build: `docker/build-push-action` with Buildx, platforms `linux/amd64,linux/arm64`, GHA layer cache, SBOM + provenance attestations.
- Push target: `<DOCKERHUB_USERNAME>/signoz-open-dashboard`; namespace comes from the repo secret `DOCKERHUB_USERNAME`, credential from `DOCKERHUB_TOKEN` (Docker Hub access token, read/write). Tags come from `docker/metadata-action`: semver (`{{version}}`, `{{major}}.{{minor}}`, `{{major}}`), `sha-<short>`, and `latest` on `v*` tags or manual runs from the default branch.
- The workflow contains no application secrets: `SIGNOZ_BASE_URL` / `SIGNOZ_API_KEY` are runtime env vars of the deployed container, never build inputs. No plaintext key may appear in workflow files or logs.
- Verification without pushing: `act` / a local `docker build .` (manual dispatch with `push=false` is the supported dry run).

### 9.2 Website (`./website`)

Marketing site + usage docs for this project. Non-goals: it never talks to SigNoz, holds no key, and is not part of the deployed embed image.

- Stack: **vinext** (Vite-based reimplementation of the Next.js API surface, App Router + RSC) + React 19 + Tailwind CSS v4 + **Magic UI** components (`motion` based).
- Build: static export (`next.config.ts` -> `output: "export"` + `trailingSlash: true`), output `website/dist/client` with one `index.html` per route directory, deployable to any static host (Cloudflare Pages / GitHub Pages / nginx). No server runtime; `pnpm dev` for local development.
- Toolchain: `website` needs Node `>=22` (vinext engine requirement); the embedding runtime keeps Node `>=20` and the Docker image never installs the site toolchain.
- Isolation: nested `website/pnpm-workspace.yaml` (`packages: []`) makes the site its own pnpm project with its own lockfile; root `pnpm install/build/test/typecheck` and the `Dockerfile` are untouched.
- Content (one route per concern, shared layout/header/footer):
  - `/` — project intro, use cases, feature grid, architecture, quick-start teaser, FAQ.
  - `/docs` — install (Docker / Node), required env, embed URL parameter reference, backend proxy allowlist matrix, error codes, theming, security notes.
  - `/design` — goals / non-goals, data flow, read-only-by-design and key-handling principles, theme plugin architecture, acceptance approach.
- Content source of truth stays `README.md` + this document; the site is a rendering of them, not a second spec.

---

## 10. Security, CORS, Headers

- `CSP frame-ancestors *` (fully public); `CORS *` (GET/POST/OPTIONS).
- NestJS global `ValidationPipe` + lightweight `throttle 120req/min/IP`.
- Warning: plaintext keys in URLs end up in browser history / proxy logs / referer; owners accept this risk. Prefer short-lived / read-only keys and rotate immediately on leak.

---

## 11. Testing and Acceptance (against the given backend)

Smoke dashboard: `019ca330-...` (System Overview (系统资源总览)) + one more dashboard with variables + table still to be prepared.

| # | Case | Expectation | Status |
|---|---|---|---|
| 1 | No `apiKey` + env has a default | 200 renders 4 panels | Passed (backend accepted; frontend to re-verify after the legacy-theme reimplementation) |
| 2 | `?apiKey=wrong` | 401 `EMBED_INVALID_API_KEY` empty state + requestId | Passed (backend mapping; frontend reimplemented per §7.4-8) |
| 3 | Wrong ID | 404 empty state | Passed (same as above) |
| 4 | Full params | Param parsing + replaceState write-back | To re-verify (`theme=shadcn` new semantics + `from/to` compat translation) |
| 5 | Upstream cut | 502 + Retry, self-heals after recovery | Partially passed (backend implemented, no live network-cut drill yet) |
| 6 | iframe-resizer parent wired / not wired | Height auto-fit / degraded internal scroll | To implement (wired once in core) |
| 7 | Chrome 108 | No blank page | To verify (vite `target: chrome108` kept) |
| 8 | Read-only | No editing entries; write APIs 403 | Passed (backend `READONLY`/`BLOCKED`; frontend implements no editing entries) |
| 9 | `/healthz` `/metrics` | Metrics healthy, logs contain no plaintext key | Passed |
| 10 | Dozens of panels | Acceptable first paint, no OOM | Not tested |
| 11 | `?theme=<unknown>` | Falls back to shadcn | To implement (registry fallback logic + unit test) |

Note: pixel-level screenshot diffing against the console is no longer done (direction changed to visual closeness, see §7); the second dashboard with variables + table still needs the owner to configure it.

---

## 12. Milestones (M4 revision: rollback to self-built UI + theme pluginization)

- M1 (done): monorepo + NestJS passthrough + `/healthz` + `/metrics` + curl matrix all green.
- M5 (frontend redo): `core/` (routing/auth/data-fetching/time-variables/replaceState/empty-state mapping) + `signoz/` (query semantics) + `themes/legacy` (default theme with full panels) + registry fallback; smoke-dashboard render acceptance.
- M6: iframe-resizer, Chrome108, offline drill, second dashboard (variables+table), docs wrap-up.
- M9: distribution and docs site — GitHub Actions Docker Hub publish (§9.1) + vinext/Magic UI website at `website/` with intro/docs/design routes (§9.2).
- Archived (no longer executed): old M2–M4 plan (first self-built UI attempt verified then discarded), 100% replica route (vendor deleted, see the bug-track decision record).

## 13. Risks

- Full-permission keys + public iframes invite abuse → doc warnings + throttle + refresh floor.
- Theme sprawl: a new theme may only add `themes/<name>/` + one registry line; core must not be touched; when theme branches appear in core, refactor back to the contract.
- `iframe-resizer` vs React18 StrictMode/antd overlay height jitter → use `lowestElement` + debounce.
- Website toolchain risk: vinext is pre-1.0; pinned via `website/pnpm-lock.yaml`, isolated from the embedding runtime, so a site breakage can never break the shipped image.

---

## Appendix A. Verified Upstream Evidence

```bash
curl -H "SIGNOZ-API-KEY: ecsOdMuggJlvmZJmscvMtXlL9HyHKOyv00nwhPubfG8=" \
  http://192.168.10.2:30303/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942
# {"status":"success","data":{"id":"019ca330-...","data":{"title":"System Overview (系统资源总览)","widgets":[...4],"version":"v5",...}}}
```

Key source paths (v0.97.0): `frontend/src/container/NewDashboard/*`, `frontend/src/providers/Dashboard/Dashboard.tsx`, `frontend/src/api/{index.ts,v5/queryRange/*,dashboard/variables/*}`, `pkg/query-service/app/{server.go:179,http_handler.go:382-383,468,474-475,520-526}`.
