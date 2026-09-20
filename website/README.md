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
| `/`       | Project intro, use cases, features, architecture, quick start teaser, FAQ, final CTA |
| `/docs`   | Install, configuration, embed URL parameters, themes, proxy matrix, error codes       |
| `/design` | Goals, non-goals, security model, theme plugin architecture, milestones, risks        |

## Commands

```bash
pnpm install
pnpm dev        # vinext dev server
pnpm build      # static export -> dist/
pnpm start      # serve the production build locally
pnpm typecheck  # tsc --noEmit
```

The build is a static export (`next.config.ts` -> `output: "export"`), so `dist/` can be deployed
to any static host (Cloudflare Pages, GitHub Pages, nginx, ...). The site never talks to SigNoz,
holds no key, and is not part of the deployed embed image.

## Adding Magic UI components

```bash
pnpm dlx shadcn@latest add @magicui/<component>
```

`components.json` maps the `@magicui` registry to `https://magicui.design/r/{name}.json`, and
`lib/utils.ts` provides the `cn` helper those components import.
