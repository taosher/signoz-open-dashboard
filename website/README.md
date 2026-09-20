# signoz-open-dashboard website

Marketing site and usage documentation for `signoz-open-dashboard`, built with
[vinext](https://github.com/cloudflare/vinext) (the Vite-based reimplementation of the Next.js API
surface) and [Magic UI](https://magicui.design) components.

This project is intentionally isolated from the repository root workspace:

- `website/pnpm-workspace.yaml` makes this directory its own pnpm workspace root with its own
  `pnpm-lock.yaml`.
- Root `pnpm install/build/test/typecheck` and the single Docker image never include this project.
- Toolchain requirement is Node `>=22` (vinext engine requirement); the embedding runtime keeps
  Node `>=20`.

## Routes

| Route     | Content                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `/`       | Project intro, live dashboard showcase, use cases, features, architecture, FAQ        |
| `/docs`   | Install, configuration, embed URL parameters, themes, proxy matrix, error codes       |
| `/design` | Goals, non-goals, security model, theme plugin architecture, milestones, risks        |

The showcase section renders `public/screenshots/demo.jpeg` (a copy of the repository's
`docs/screenshots/demo.jpeg`). The favicon is `app/icon.png`, copied from
`apps/web/public/images/zenlix-logo.png` and picked up by the metadata-file convention.

## Commands

```bash
pnpm install
pnpm dev                    # vinext dev server
pnpm build                  # static export -> dist/client
pnpm start                  # serve the production build locally
pnpm typecheck              # tsc --noEmit
pnpm run deploy:workers     # wrangler deploy --config deploy/wrangler.jsonc
pnpm run deploy:workers:dry-run
pnpm run deploy:pages:create   # create the Pages project (idempotent in CI via `|| true`)
pnpm run deploy:pages          # wrangler pages deploy dist/client --project-name=...
```

The build is a static export (`next.config.ts` -> `output: "export"` + `trailingSlash: true`), so
`dist/client` can be deployed to any static host (Cloudflare Workers/Pages, GitHub Pages, nginx).
The site never talks to SigNoz, holds no key, and is not part of the deployed embed image.

## Cloudflare deployment (Workers + Pages)

The same static export is deployed to two Cloudflare targets so both hostnames exist:

- **Workers** (`signoz-open-dashboard-website.<account>.workers.dev`) — `deploy/wrangler.jsonc`,
  assets-only Worker with `assets.directory: ../dist/client` and `not_found_handling: 404-page`.
- **Pages** (`signoz-open-dashboard-website.pages.dev`) — `wrangler pages deploy dist/client
  --project-name=signoz-open-dashboard-website`, production branch `main`; deployments from other
  refs become preview URLs.

`.github/workflows/website-deploy.yml` runs on pushes to `main` touching `website/**`: install,
typecheck, build, then both deploys. Required repository secrets: `CLOUDFLARE_API_TOKEN` (needs
**Workers Scripts: Edit** and **Cloudflare Pages: Edit**) and `CLOUDFLARE_ACCOUNT_ID`.

The wrangler config intentionally lives in `deploy/` rather than the project root: vinext treats a
root `wrangler.jsonc` as a request for the Cloudflare RSC/Workers runtime and requires
`@cloudflare/vite-plugin`, which a static export does not need.

## Adding Magic UI components

```bash
pnpm dlx shadcn@latest add @magicui/<component>
```

`components.json` maps the `@magicui` registry to `https://magicui.design/r/{name}.json`, and
`lib/utils.ts` provides the `cn` helper those components import.
