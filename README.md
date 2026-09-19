# signoz-open-dashboard

Embed SigNoz v0.97.0 dashboards in any third-party site with a single iframe — pixel-consistent, read-only, single Docker image.

```html
<iframe
  src="https://embed.example.com/embed/<dashboardId>?apiKey=<key>&from=now-6h&to=now&theme=light&locale=en"
  style="width:100%;border:0"
  allowfullscreen>
</iframe>
```

No login page, no management UI. The caller just builds the URL.

> Note: the canonical spec is `docs/product-tech-design.md` (Chinese). This README is an English overview for OSS visibility. In case of conflict, the design doc wins.

## Why this exists

SigNoz OSS v0.97.0 removed public dashboard sharing (only Copy/Download JSON remains, and `/dashboard/:id` requires login). Its query-service already accepts `SIGNOZ-API-KEY` for dashboard reads and `query_range`, which is the legal hook this project uses: a thin NestJS proxy injects the key server-side, and a vendored React frontend renders the same chart stack as the SigNoz console.

## Features

- **One-line embed**: `GET /embed/:dashboardId?...` renders title + toolbar + `GridGraphs`.
- **Pixel-consistent charts**: same render subtree as SigNoz 0.97.0 (`uPlot`, `@grafana/data`, `visx`, `react-query`, `redux`, `antd@5.11.0` pinned).
- **Read-only by design**: edit/clone/delete/settings/lock/alerts UIs are stripped; write APIs return `403 EMBED_READONLY` / `EMBED_BLOCKED`.
- **Key flexibility**: effective key = `x-embed-api-key` header (from URL `apiKey`, memory-only) `?? env.SIGNOZ_API_KEY`. Missing key yields a friendly `401` empty state, never a stack trace.
- **URL-driven view**: time, theme, locale, refresh, variables, toolbar/title/fullscreen all come from query params and sync back via `history.replaceState`.
- **Public iframe**: intentional `CSP frame-ancestors *` and `CORS *`.
- **Observable**: `GET /healthz`, `GET /metrics` (prom-client), JSON logs with redacted queries and key hash (first 8 chars) only.

## Architecture

```text
Third-party site
  │ <iframe src=".../embed/:id?...">
  ▼
┌────────────────────────────────────────┐
│ signoz-open-dashboard (single image)   │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ apps/web     │─▶│ apps/api :8080  │ │
│  │ React18+antd │  │ /api/signoz/*───┼─┼─▶ Upstream SigNoz 0.97.0
│  │ /embed/:id   │  │ /healthz        │ │   (SIGNOZ-API-KEY injected)
│  └──────────────┘  └─────────────────┘ │
│  NestJS ServeStatic serves web/dist    │
└────────────────────────────────────────┘
```

- `apps/api` (NestJS 10): stateless pass-through proxy + static hosting + health/metrics. No result caching, no key storage.
- `apps/web` (Vite + React 18): standalone embed app. Reference snapshot lives in `third_party/signoz-0.97.0` (read-only, not built); patches are logged in `PATCHES.md`.
- `packages/shared`: `parseEmbedParams` / `serializeEmbedParams` / `sanitizeQuery`, `EMBED_*` error codes shared by both ends.

Data flow: browser loads static HTML → web parses URL into memory-only `EmbedAuthContext` (never `localStorage`/cookie) → all data calls go to same-origin `/api/signoz/...` with `x-embed-api-key` → NestJS injects `SIGNOZ-API-KEY`, strips inbound `authorization`/`cookie`, and streams the upstream response back with `x-embed-request-id`.

## Quick start

Prerequisites: Node `>=20`, `pnpm@9`.

```bash
pnpm install
# dev (run both):
SIGNOZ_BASE_URL=http://<signoz-host>:30303 SIGNOZ_API_KEY=<key> pnpm dev:api
pnpm dev:web   # vite :5173, /api/signoz proxies to :8080
```

Production:

```bash
pnpm build   # builds all + syncs apps/web/dist -> apps/api/web-dist
SIGNOZ_BASE_URL=http://<signoz-host>:30303 SIGNOZ_API_KEY=<key> node apps/api/dist/main.js
# health: GET /healthz | metrics: GET /metrics
```

Docker (single image, `Dockerfile` + `docker-compose.yml`):

```bash
SIGNOZ_BASE_URL=http://<signoz-host>:30303 SIGNOZ_API_KEY=<key> docker compose up --build
# serves on :8080
```

## Embed URL

Base: `{EMBED_ORIGIN}/embed/:dashboardId` where `dashboardId` is a SigNoz UUID v7. Invalid format short-circuits to a `404` empty state without hitting upstream.

| Param | Example | Default | Notes |
|---|---|---|---|
| `apiKey` | `?apiKey=<key>` | `env.SIGNOZ_API_KEY` | URL wins over env. Missing → `401 EMBED_MISSING_API_KEY`. |
| `from` / `to` | `now-6h` / `now` | `now-6h` / `now` | Legacy aliases, translated once at mount to native time. |
| `theme` | `light` / `dark` | `light` | Pre-seeded before `ThemeProvider`. |
| `locale` | `zh` / `en` | `zh` | Switches `i18n` copy. |
| `refresh` | `off` / `30s` / `1m` | dashboard saved value | Clamped to `>=10s` (`MAX_REFRESH_SECONDS_FLOOR`). |
| `annotations` | `true` / `false` | `true` | Reserved flag (OSS 0.97.0 has no upstream source yet). |
| `var-<name>` | `?var-env=prod` | dashboard default | Highest priority, overrides dashboard defaults. |
| `title` / `toolbar` | `?title=false` | `true` | Minimal chrome toggles for kiosk/big-screen. |
| `fullscreen` | `?fullscreen=true` | `false` | Enter fullscreen directly. |

All changes sync back with `replaceState` (no history pollution). `serializeEmbedParams` never writes the server default key back into the URL — the key stays in the URL only if the caller put it there.

Auto-resize: the child ships `@iframe-resizer/child`. Parent pages may optionally load `@iframe-resizer/parent@5`; without it the embed falls back to internal scroll.

## Backend proxy

Controller: `ALL /api/signoz/*` → strip prefix → `SIGNOZ_BASE_URL + path + query`, preserving method/body/streaming, injecting `SIGNOZ-API-KEY`, returning upstream payload verbatim plus `x-embed-request-id`.

| Upstream | Method | Policy |
|---|---|---|
| `/api/v1/dashboards/:id` | GET | Pass through. `PUT/POST/DELETE`/`/lock` → `403 EMBED_READONLY`. |
| `/api/v3/query_range`, `/query_range/format` | POST | Pass through (legacy panels). |
| `/api/v4/query_range` | POST | Pass through. |
| `/api/v5/query_range` | POST | Pass through (primary). |
| `/api/v5/substitute_vars` | POST | Pass through. |
| `/api/v2/variables/query` | POST | Pass through. |
| `/api/v1/version`, `/api/v1/features` | GET | Pass through or local stub. |
| `/api/v1/rules`, `/alerts`, `/channels`, `/user/*`, `/org/*` | * | `403 EMBED_BLOCKED`, never proxied. |
| All other `/api/*` | * | Default-deny `403`. |

Timeouts: `30s` for `query_range`, `10s` for dashboard meta; frontend cancels via `AbortSignal`. Global throttle ~`120 req/min/IP`.

## Configuration

| Var | Required | Default | Notes |
|---|---|---|---|
| `SIGNOZ_BASE_URL` | yes | — | Single upstream, `http(s)` only or the process crashes at boot. Never taken from URL (SSRF guard). |
| `SIGNOZ_API_KEY` | no | empty | Default key; empty only warns. |
| `PORT` | no | `8080` | NestJS listen port. |
| `UPSTREAM_TIMEOUT_MS` | no | `30000` | Meta calls use `10000`. |
| `MAX_REFRESH_SECONDS_FLOOR` | no | `10` | Refresh clamp. |
| `LOG_LEVEL` | no | `info` | pino JSON. |
| `CORS_ORIGIN` | no | `*` | Public by design. |

Logs contain `requestId, method, upstreamPath (sanitized), dashboardId, upstreamStatus, durationMs, bytes, userAgent, referer, effectiveKeySource, effectiveKeyHash8` — never the plaintext key. `apiKey/apikey/access_token` (case-insensitive) are redacted before query serialization.

Error codes (`packages/shared/errors.ts`): `EMBED_MISSING_API_KEY (401)`, `EMBED_INVALID_API_KEY (401)`, `EMBED_DASHBOARD_NOT_FOUND (404)`, `EMBED_UPSTREAM_UNAVAILABLE (502)`, `EMBED_READONLY / EMBED_BLOCKED (403)`. Each maps to an empty state with icon + copy + `requestId` + Retry where applicable.

## Development

```bash
pnpm install
pnpm build                 # all packages + web-dist sync
pnpm build:api
pnpm build:shared
pnpm test                  # all
pnpm --filter @signoz-open-dashboard/api test:e2e  # proxy matrix incl. mock upstream
pnpm typecheck
pnpm dev:api
pnpm dev:web
```

Reference checkout (read-only, do not modify): `~/develop/open-source/signoz @ v0.97.0`. Reuse goes through the `third_party/signoz-0.97.0` snapshot with diffs in `PATCHES/`.

Connectivity probe:

```bash
curl -H "SIGNOZ-API-KEY: <key>" \
  <SIGNOZ_BASE_URL>/api/v1/dashboards/<dashboardId>
```

## Project layout

```text
apps/api/src/
  main.ts                    # :8080, ServeStatic, CSP frame-ancestors *, CORS *
  proxy/signoz-proxy.*       # /api/signoz/* pass-through + key injection
  observability/             # redacting logger, metrics, exception filter
apps/web/src/                # embed app (/embed/:dashboardId, memory-only key)
  third_party/signoz-0.97.0/ # read-only reference snapshot + PATCHES.md
packages/shared/             # embedParams.ts, errors.ts
Dockerfile                   # webbuild -> apibuild -> node runtime
docker-compose.yml
docs/product-tech-design.md  # single source of truth (Chinese)
```

## Security notes

- URL keys end up in browser history / proxy logs / referers. Use short-lived, read-only keys and rotate on leak.
- Single fixed upstream (`SIGNOZ_BASE_URL`); dynamic backends are out of scope.
- Frontend keeps the key in memory only (`EmbedAuthContext`), never `localStorage`/cookie/URL echo of the env default.

## License

See SigNoz upstream licensing for vendored portions; project glue as configured in this repo.
