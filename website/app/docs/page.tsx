import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CodeBlock } from "@/components/code-block";
import { BlurFade } from "@/components/ui/blur-fade";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Install signoz-open-dashboard, embed a dashboard, tune the URL parameters, and understand the proxy allowlist and error codes.",
};

const toc = [
  { id: "getting-started", label: "Getting started" },
  { id: "configuration", label: "Configuration" },
  { id: "embed-url", label: "Embed URL" },
  { id: "themes", label: "Themes and variables" },
  { id: "proxy-matrix", label: "Proxy matrix" },
  { id: "error-codes", label: "Error codes" },
  { id: "operations", label: "Operations" },
  { id: "security", label: "Security notes" },
];

const methodStyles: Record<string, string> = {
  GET: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  POST: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  ANY: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function Method({ method }: { method: keyof typeof methodStyles | string }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] ${methodStyles[method] ?? methodStyles.ANY}`}
    >
      {method}
    </span>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/5 pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {head.map((cell) => (
              <th key={cell} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/5 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? "px-4 py-3 align-top font-mono text-xs text-foreground"
                      : "px-4 py-3 align-top text-muted-foreground"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <BlurFade inView>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Documentation</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight">
          Embed a live SigNoz dashboard in one afternoon
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          This service ships as a single Docker image that serves the embed app and proxies the
          read-only SigNoz API. Bring a SigNoz 0.97.0 backend and an API key with dashboard view
          permission.
        </p>
      </BlurFade>

      <div className="mt-12 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-2 text-sm">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-12">
          <DocSection id="getting-started" title="Getting started">
            <p>
              Prerequisites: Node <span className="font-mono text-foreground">&gt;=20</span> and{" "}
              <span className="font-mono text-foreground">pnpm@9</span> for source builds, or Docker
              for the image. You also need a running SigNoz v0.97.0 backend and an API key with
              dashboard view permission.
            </p>
            <p className="font-medium text-foreground">Docker (recommended)</p>
            <CodeBlock
              language="bash"
              code={`docker run -p 8080:8080 \\
  -e SIGNOZ_BASE_URL=http://<signoz-host>:30303 \\
  -e SIGNOZ_API_KEY=<read-only-key> \\
  your-org/signoz-open-dashboard:latest

# 1. open a dashboard: http://localhost:8080/embed/<dashboardId>
# 2. embed it:
#    <iframe src="http://localhost:8080/embed/<dashboardId>?relativeTime=30m"></iframe>`}
            />
            <p className="font-medium text-foreground">From source</p>
            <CodeBlock
              language="bash"
              code={`pnpm install

# dev: web on :5173 proxies /api/signoz to the API on :8080
SIGNOZ_BASE_URL=http://<signoz-host>:30303 SIGNOZ_API_KEY=<key> pnpm dev:api
pnpm dev:web

# production
pnpm build
SIGNOZ_BASE_URL=http://<signoz-host>:30303 SIGNOZ_API_KEY=<key> node apps/api/dist/main.js`}
            />
            <p>
              Verify connectivity against SigNoz directly before debugging the proxy:
            </p>
            <CodeBlock
              language="bash"
              code={`curl -H "SIGNOZ-API-KEY: <key>" \\
  http://<signoz-host>:30303/api/v1/dashboards/<dashboardId>`}
            />
          </DocSection>

          <DocSection id="configuration" title="Configuration">
            <p>
              The backend is a single upstream fixed by <span className="font-mono text-foreground">SIGNOZ_BASE_URL</span>;
              a backend address is never accepted from URL parameters. A non-http(s) base URL crashes
              at boot, and an empty default key only warns.
            </p>
            <Table
              head={["Variable", "Required", "Default", "Notes"]}
              rows={[
                ["SIGNOZ_BASE_URL", "Yes", "-", "The only upstream. http(s) only, never taken from the URL (SSRF guard)."],
                ["SIGNOZ_API_KEY", "No", "empty", "Default key, overridable by the URL apiKey. Empty only warns."],
                ["PORT", "No", "8080", "Listen port."],
                ["UPSTREAM_TIMEOUT_MS", "No", "30000", "query_range timeout; dashboard metadata uses 10000."],
                ["MAX_REFRESH_SECONDS_FLOOR", "No", "10", "Refresh intervals below this are clamped."],
                ["LOG_LEVEL", "No", "info", "pino JSON logs."],
                ["CORS_ORIGIN", "No", "*", "Public by design, do not tighten blindly."],
              ]}
            />
          </DocSection>

          <DocSection id="embed-url" title="Embed URL">
            <p>
              Base: <span className="font-mono text-foreground">{"{EMBED_ORIGIN}"}/embed/:dashboardId</span>.
              An invalid dashboard id short-circuits to a 404 empty state without calling upstream.
              The view is fully URL-driven and syncs back via{" "}
              <span className="font-mono text-foreground">history.replaceState</span>, so every view
              is a shareable link.
            </p>
            <CodeBlock
              language="html"
              code={`<iframe
  src="https://embed.example.com/embed/<dashboardId>?apiKey=<key>&relativeTime=30m&theme=shadcn&mode=light&refresh=30s&var-env=prod"
  style="width:100%;border:0"
  allowfullscreen>
</iframe>`}
            />
            <Table
              head={["Param", "Example", "Default", "Notes"]}
              rows={[
                ["apiKey", "?apiKey=<key>", "env.SIGNOZ_API_KEY", "URL wins over env. Missing key renders a 401 empty state. Never written back unless the caller put it there."],
                ["relativeTime / startTime+endTime", "30m, or epoch seconds", "30m", "Native time params. Legacy from=now-30m&to=now is translated once at mount."],
                ["theme", "shadcn / legacy", "shadcn", "Unknown values fall back to shadcn."],
                ["mode", "light / dark", "light", "Color mode, orthogonal to theme."],
                ["locale", "zh / en", "zh", "Rendered by the active theme."],
                ["refresh", "off / 30s / 1m", "dashboard value", "Clamped to >= 10s."],
                ["annotations", "true / false", "true", "Read-only annotation markers."],
                ["var-<name>", "?var-env=prod", "dashboard default", "Highest priority, overrides dashboard defaults. One dashboard can serve every customer, region or tier."],
                ["title / toolbar", "?title=false", "true", "Chrome toggles for kiosk and big-screen use."],
                ["timeControl / refreshControl / modeControl / fullscreenControl / localeControl", "show / hidden / disabled", "show", "Per-control visibility. toolbar=false hides the whole bar."],
                ["fullscreen", "?fullscreen=true", "false", "Enter fullscreen right after load."],
              ]}
            />
            <p>
              Auto-resize: the child ships{" "}
              <span className="font-mono text-foreground">@iframe-resizer/child</span>. Parents may
              optionally load <span className="font-mono text-foreground">@iframe-resizer/parent@5</span>;
              without it the embed falls back to internal scroll.
            </p>
          </DocSection>

          <DocSection id="themes" title="Themes and variables">
            <p>
              Two themes implement the same <span className="font-mono text-foreground">ThemeModule</span>{" "}
              contract (Tokens, Toolbar, WidgetCard, ErrorState): <span className="font-mono text-foreground">shadcn</span>{" "}
              (Tailwind + Recharts, default) and <span className="font-mono text-foreground">legacy</span>{" "}
              (antd + ECharts). Color mode is orthogonal: <span className="font-mono text-foreground">?theme=legacy&amp;mode=dark</span>.
            </p>
            <p>
              Variable handling covers QUERY-type candidates via{" "}
              <span className="font-mono text-foreground">POST /api/v2/variables/query</span>,
              DYNAMIC-type candidates via <span className="font-mono text-foreground">GET /api/v1/fields/values</span>,
              and expression substitution via{" "}
              <span className="font-mono text-foreground">POST /api/v5/substitute_vars</span>. A{" "}
              <span className="font-mono text-foreground">var-&lt;name&gt;</span> parameter wins over
              the dashboard default.
            </p>
            <p>
              A custom theme adds <span className="font-mono text-foreground">themes/&lt;name&gt;/</span>{" "}
              plus one registry line. The <span className="font-mono text-foreground">core/</span> layer
              stays theme-agnostic and is never touched by a theme.
            </p>
          </DocSection>

          <DocSection id="proxy-matrix" title="Proxy matrix">
            <p>
              All SigNoz traffic goes through{" "}
              <span className="font-mono text-foreground">ALL /api/signoz/*</span>, which strips the
              prefix, forwards to <span className="font-mono text-foreground">SIGNOZ_BASE_URL</span>,
              injects <span className="font-mono text-foreground">SIGNOZ-API-KEY</span>, strips inbound
              authorization and cookie headers, and returns the response with an{" "}
              <span className="font-mono text-foreground">x-embed-request-id</span>. The proxy denies
              by default: only the routes below are allowed.
            </p>
            <Table
              head={["Upstream", "Method", "Policy"]}
              rows={[
                ["/api/v1/dashboards/:id", <Method key="m" method="GET" />, "Pass through. PUT/POST/DELETE and /lock return 403 EMBED_READONLY."],
                ["/api/v3/query_range, /query_range/format", <Method key="m" method="POST" />, "Pass through (legacy panels)."],
                ["/api/v4/query_range", <Method key="m" method="POST" />, "Pass through."],
                ["/api/v5/query_range", <Method key="m" method="POST" />, "Pass through (primary path)."],
                ["/api/v5/substitute_vars", <Method key="m" method="POST" />, "Pass through."],
                ["/api/v2/variables/query", <Method key="m" method="POST" />, "Pass through (QUERY-type variable candidates)."],
                ["/api/v1/fields/values", <Method key="m" method="GET" />, "Pass through (DYNAMIC-type variable candidates)."],
                ["/api/v1/version, /api/v1/features", <Method key="m" method="GET" />, "Pass through or local stub."],
                ["/api/v1/rules, /alerts, /channels, /user/*, /org/*, /invite/*", <Method key="m" method="ANY" />, "403 EMBED_BLOCKED, never proxied."],
                ["All other /api/*", <Method key="m" method="ANY" />, "Default-deny 403."],
              ]}
            />
            <p>
              Timeouts: 30s for query_range and 10s for dashboard metadata; the frontend cancels
              in-flight requests via <span className="font-mono text-foreground">AbortSignal</span>.
              Global throttle is about 120 requests/minute/IP.
            </p>
          </DocSection>

          <DocSection id="error-codes" title="Error codes">
            <p>
              Every failure maps to a typed code and an empty state with Retry where it makes sense.
              Codes live in <span className="font-mono text-foreground">packages/shared/errors.ts</span>.
            </p>
            <Table
              head={["Code", "HTTP", "Meaning"]}
              rows={[
                ["EMBED_MISSING_API_KEY", "401", "No key in the URL and no env default."],
                ["EMBED_INVALID_API_KEY", "401", "Upstream rejected the effective key."],
                ["EMBED_DASHBOARD_NOT_FOUND", "404", "Invalid id format (short-circuited) or unknown id upstream."],
                ["EMBED_UPSTREAM_UNAVAILABLE", "502", "Connection failure or timeout to SigNoz."],
                ["EMBED_READONLY", "403", "A write was attempted against a read-only route."],
                ["EMBED_BLOCKED", "403", "Route outside the allowlist."],
              ]}
            />
          </DocSection>

          <DocSection id="operations" title="Operations">
            <p>
              <span className="font-mono text-foreground">GET /healthz</span> reports liveness and{" "}
              <span className="font-mono text-foreground">GET /metrics</span> exposes Prometheus
              metrics (prom-client). JSON logs record the effective key source and an 8-char hash of
              the key, never the plaintext value; API key fields are stripped from query strings
              before serialization.
            </p>
            <CodeBlock
              language="bash"
              code={`curl http://localhost:8080/healthz
curl http://localhost:8080/metrics | head`}
            />
            <p>
              The single-image deployment is stateless: no query results are cached and no keys are
              stored. Scale by running more replicas behind any load balancer.
            </p>
          </DocSection>

          <DocSection id="security" title="Security notes">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                URL keys end up in browser history, proxy logs and referers. Use short-lived,
                read-only keys and rotate immediately on leak.
              </li>
              <li>
                The embed is public by design: <span className="font-mono text-foreground">CSP frame-ancestors *</span>{" "}
                and <span className="font-mono text-foreground">CORS *</span> are intentional.
              </li>
              <li>
                The frontend keeps keys in memory only. There is no localStorage, cookie or URL
                echo of the env default key.
              </li>
              <li>
                Write interfaces are not merely hidden: they are blocked at the proxy with 403.
              </li>
            </ul>
          </DocSection>
        </div>
      </div>
    </main>
  );
}
