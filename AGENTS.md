# AGENTS.md

> This file is the working contract for agents in this repo. On any conflict below, `docs/product-tech-design.md` wins.

## 1. Single source of truth (docs-first)

- `docs/product-tech-design.md` is the single source of truth.
- Any design change (URL params, proxy matrix, trim list, env, error codes, deployment shape) must update that document first, then the code. A code change without the doc update is invalid.
- When docs conflict with code/comments, the docs win, and a row is added to `bug-track.md`.

## 2. Repo status and boundaries

- Target structure of this repo (see design doc §5.1/§7): `apps/api` (NestJS) + `apps/web` (theme plugin architecture: `core/` + `signoz/` + `themes/shadcn` (default) + `themes/legacy`) + `packages/shared` + single Docker image. `apps/web/src/vendor/` (artifact of the 100% replica route) has been deleted, do not recreate it; the SigNoz reference implementation is read-only, do not copy it verbatim.
- The SigNoz reference implementation is read-only: `~/develop/open-source/signoz @ v0.97.0`. Do not modify it, and do not copy its frontend verbatim into this repo's runtime; reuse of query semantics is done against the `third_party/signoz-0.97.0` snapshot (reproducible, not committed) for comparison.
- The single backend Upstream is fixed by the env `SIGNOZ_BASE_URL` (one backend, SSRF protection). Never accept a backend address via URL params.
- The test backend and acceptance dashboard follow the smoke table in the design doc; see Appendix A of the design doc for `curl` verification. For debugging, prefer `GET /api/v1/dashboards/:id` with the `SIGNOZ-API-KEY` header to verify connectivity.

## 3. Workflow (five hard constraints)

1. **Docs before code**: design change → update `docs/product-tech-design.md` → then change code.
2. **Commit messages**: English, conventional commits, imperative mood, first line ≤72 chars. Types limited to `feat/fix/docs/refactor/test/chore`. Example: `feat(api): proxy query_range with api key injection`.
3. **Technical docs**: always English (including `docs/`, design notes in comments, PR descriptions). Commit messages are English too.
4. **Pitfall log**: for any pitfall found during development/debugging/testing, immediately append a table row to the root `bug-track.md` with the fixed columns `Date/Phenomenon/Root cause/Handling/Status/Related`, do not open another file.
5. **Single TODO entry**: `TODOS.md` is the only TODO list. A task may only be marked done after "code complete + tests pass"; no verbal completion marks.

## 4. Commands and verification

- Package manager `pnpm@9` (pinned in the root `package.json`), Node `>=20`. First time: `pnpm install`.
- Build all: `pnpm build` (auto-syncs `web/dist` → `api/web-dist`); single package: `pnpm build:api` / `pnpm build:shared` / `pnpm build:web`.
- Test all: `pnpm test`; API unit tests: `pnpm test:api`; API e2e (proxy matrix with mocked upstream): `pnpm --filter @signoz-open-dashboard/api test:e2e`.
- Typecheck: `pnpm typecheck` (or per package `pnpm --filter <pkg> typecheck`).
- Start the API locally: `SIGNOZ_BASE_URL=http://192.168.10.2:30303 SIGNOZ_API_KEY=<key> pnpm dev:api` (dev, watch); production build artifact: `SIGNOZ_BASE_URL=... node apps/api/dist/main.js`. Health check: `GET /healthz`, metrics: `GET /metrics`.
- Local frontend dev: `pnpm dev:web` (vite on :5173, `/api/signoz` proxied to `:8080`, requires `dev:api` running alongside); after a full build `apps/web/dist` is auto-synced to `apps/api/web-dist` (`scripts/sync-web-dist.js`, the NestJS ServeStatic mount point).
- Note: `apps/web` is being redone in M5, so `pnpm build:web` / `pnpm build` are expected to fail (leftover files still reference the deleted `vendor/`). This is normal and recovers once M5 lands; `pnpm build:api` / `pnpm test` are unaffected.
- For the real-backend integration matrix (dashboard GET / query_range passthrough / write-interface 403 / error-code mapping) see the M1 acceptance record in `TODOS.md`; probe with `GET /api/signoz/api/v1/dashboards/:id` + the `x-embed-api-key` header.
- Commands against the SigNoz reference repo are for lookup only, do not build it from this repo (except `git archive/show` for snapshots and `curl` liveness probes).
- Use dedicated tools for file operations (`read/edit/write`); use `bash` only for terminal operations such as `git/curl/docker/pnpm`, never for reading/writing files with `cat/sed/awk/echo`.
- Release ego-browser immediately after use: close every TaskSpace with `task.finish({keep: []})` once done, do not pile up spaces/pages; kill local dev services (background processes on `:5173`/`:8080`) after verification; prefer reusing the same space for browser verification (`goto` instead of opening a new space) to avoid exhausting local resources.
- ego-browser allows at most 2 TaskSpaces at a time: call `listTaskSpaces()` before each use, and if there are more than 2, close all the old ones with `finish({keep: []})` before creating a new one.

## 5. Red lines (where agents most easily go wrong)

- Never log a plaintext API key: logs, bug-track, TODOS, commits, and newly added doc content may only contain `effectiveKeySource/effectiveKeyHash(first 8 chars)`; strip `apiKey/apikey/access_token` (case-insensitive) before serializing queries.
- Proxy denies by default: except for the §6.2 allowlist in the design doc (dashboards GET, v3/v4/v5 query_range, substitute_vars, v2 variables/query, version/features), everything else under `/api/*` returns 403; never proxy write interfaces (dashboard PUT/POST/DELETE, `/lock`, rules/alerts/user/org).
- Frontend keys live only in memory; never write to `localStorage/cookie/URL echo of the env default key` (see the `serializeEmbedParams` rule in design doc §8).
- Public iframe embedding: `CSP frame-ancestors *` and `CORS *` are intentional, do not "harden" them to DENY on your own initiative.
- Node is pinned to `20 LTS`; `apps/web` uses the theme plugin architecture (see design doc §7): never recreate `src/vendor` (the verbatim-copy route is abandoned); a new theme only adds `themes/<name>/` plus one registry line, never touches `core/`; the `shadcn` (default) and `legacy` theme component libraries are covered in §7.6/§7.3 and are locked after the major version, no further upgrades.

## 6. Skills

- Before writing NestJS code, read the in-repo skill: `.agents/skills/nestjs-best-practices/SKILL.md` (DTO/validation, exception filter, health check, rate-limit conventions).
