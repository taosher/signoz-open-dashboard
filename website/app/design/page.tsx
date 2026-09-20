import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";

export const metadata: Metadata = {
  title: "Design principles",
  description:
    "Why signoz-open-dashboard is read-only, SSRF-safe, URL-driven and theme-pluggable, and how the design document drives the code.",
};

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/5 pt-12 first:border-t-0 first:pt-0">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="h-full rounded-xl border border-white/10 bg-card p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

const milestones = [
  {
    id: "M1",
    title: "Proxy foundation",
    body: "Monorepo skeleton, NestJS /api/signoz/* passthrough, /healthz and /metrics, curl proxy matrix green against a real v0.97.0 backend.",
    status: "Done",
  },
  {
    id: "M5",
    title: "Embed app redo",
    body: "core/ routing, auth, fetching, time and variables, replaceState and empty-state mapping; signoz/ query semantics; legacy theme; theme registry fallback.",
    status: "Done",
  },
  {
    id: "M7",
    title: "TanStack Query v5",
    body: "SWR updates, request dedup, placeholder-driven no-flash loading, exponential-backoff retry and focus/reconnect suppression.",
    status: "Done",
  },
  {
    id: "M8",
    title: "shadcn theme",
    body: "Default theme with Tailwind and Recharts, implementing the same ThemeModule contract as legacy. Visual polish is ongoing.",
    status: "In progress",
  },
  {
    id: "M9",
    title: "Distribution and docs site",
    body: "GitHub Actions image publish to Docker Hub plus this vinext + Magic UI website with intro, docs and design routes.",
    status: "Done",
  },
];

const risks = [
  {
    risk: "Full-permission keys plus public iframes invite abuse.",
    mitigation:
      "Documented warnings, 120 req/min/IP throttle, refresh floor of 10s, and a recommendation to use read-only short-lived keys.",
  },
  {
    risk: "Theme sprawl: themes leaking branches into core.",
    mitigation:
      "A new theme only adds themes/<name>/ plus one registry line. When theme conditionals appear in core, they are refactored back to the contract.",
  },
  {
    risk: "iframe-resizer height jitter under StrictMode and overlays.",
    mitigation: "lowestElement strategy plus debounce, with internal scroll as the degraded fallback.",
  },
  {
    risk: "Marketing site toolchain breaking the shipped image.",
    mitigation:
      "website/ is an isolated pnpm project with its own lockfile; the Docker image and root build never include it.",
  },
];

export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <BlurFade inView>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Design rationale</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Built to be <AuroraText colors={["#f97316", "#fdba74", "#fb923c", "#f59e0b"]}>safe in front of strangers</AuroraText>
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          The product and technical design document is the single source of truth for this project.
          This page is a rendering of its decisions: goals, data flow, the read-only posture, key
          handling, the theme plugin architecture and the acceptance approach.
        </p>
      </BlurFade>

      <div className="mt-14 space-y-12">
        <Section id="goals" eyebrow="Goals" title="What version 1 must do">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="One-line embed">
              Any third-party site can embed a read-only dashboard with a single iframe URL. Callers
              assemble the URL; no admin UI is needed.
            </Card>
            <Card title="Console-level fidelity">
              Under the same dashboard id, time range and variables, chart type, data, tooltip,
              legend and formatting match the SigNoz console.
            </Card>
            <Card title="URL-driven view">
              Time, theme, color mode, locale, refresh, variables and chrome toggles all come from
              query params and sync back to the URL.
            </Card>
            <Card title="Graceful failure">
              Wrong key, wrong id and dead backend produce distinguishable empty states with Retry
              and a request id instead of a blank page or stack trace.
            </Card>
            <Card title="Key flexibility">
              A URL key wins over an env default; a missing key renders a friendly 401 state. Keys
              never touch localStorage, cookies or logs in plaintext.
            </Card>
            <Card title="Observable runtime">
              /healthz and /metrics plus JSON logs that carry only the key source and an 8-char hash.
            </Card>
          </div>
        </Section>

        <Section id="non-goals" eyebrow="Non-goals" title="What is explicitly out of scope">
          <ul className="list-disc space-y-2 pl-5">
            <li>No user system, SSO or RBAC, and no key issuance or rotation. Key risk stays with the owner.</li>
            <li>No dynamic switching across multiple SigNoz backends: the single upstream is fixed by SIGNOZ_BASE_URL, which prevents SSRF.</li>
            <li>No domain allowlist. The embed is fully public: anyone holding the link can view.</li>
            <li>No dashboard editing, creation, deletion, locking or alert management.</li>
            <li>No dashboard list, playlists or snapshot export in v1.</li>
          </ul>
          <p>
            Phase 1 chrome decision: hide alerts, hide the lock switch and show annotations read-only.
          </p>
        </Section>

        <Section id="readonly" eyebrow="Read-only" title="Default deny, enforced at the proxy">
          <p>
            Read-only is not a UI state; it is an allowlist in the backend. The frontend implements no
            editing entries, and the proxy forwards only dashboard reads, the v3/v4/v5 query_range
            family, substitute_vars and the two variable-candidate endpoints. Everything else under
            /api/* returns 403, including every write interface.
          </p>
          <p>
            This split matters because the embed is public. A hidden button is still one request away;
            a blocked route is not.
          </p>
        </Section>

        <Section id="keys" eyebrow="Key handling" title="Effective key, memory only">
          <p>
            The effective key resolves as{" "}
            <span className="font-mono text-foreground">
              x-embed-api-key ?? URL apiKey ?? env.SIGNOZ_API_KEY
            </span>
            . The browser keeps the URL key in memory only; it is never written to localStorage, a
            cookie or serialized back into the URL unless the caller put it there.
          </p>
          <p>
            Logs and documents may only contain the key source and the first 8 characters of a hash.
            Query strings are redacted before serialization, so plaintext keys cannot land in logs,
            bug reports or commits.
          </p>
        </Section>

        <Section id="themes" eyebrow="Frontend" title="Core plus a theme plugin architecture">
          <p>
            The frontend is split into <span className="font-mono text-foreground">core/</span> (stable:
            routing, auth context, data fetching, time and variables, replaceState, empty-state
            mapping), <span className="font-mono text-foreground">signoz/</span> (query semantics), and{" "}
            <span className="font-mono text-foreground">themes/&lt;name&gt;/</span>.
          </p>
          <p>
            A theme implements four components: Tokens, Toolbar, WidgetCard and ErrorState. The{" "}
            <span className="font-mono text-foreground">shadcn</span> theme (default) uses Tailwind and
            Recharts; the <span className="font-mono text-foreground">legacy</span> theme uses antd and
            ECharts. Unknown theme values fall back to shadcn in one registry lookup.
          </p>
          <p>
            The rule that keeps this honest: a new theme adds a folder and one registry line, and never
            touches core. Theme branches inside core are treated as bugs and refactored back to the
            contract.
          </p>
        </Section>

        <Section id="docs-first" eyebrow="Process" title="Docs first, then code">
          <p>
            Any design change (URL params, proxy matrix, trim list, env vars, error codes, deployment
            shape) updates the design document before the code, and a code change without the document
            update is invalid. Pitfalls found while developing or debugging are appended as rows to a
            single bug-track file with fixed columns.
          </p>
          <p>
            This is deliberately boring: it keeps one source of truth, one TODO list and one pitfall
            log, so both humans and agents can audit why a decision exists.
          </p>
        </Section>

        <Section id="versioning" eyebrow="Compatibility" title="Pin the API surface, do not copy the vendor">
          <p>
            SigNoz v0.97.0 query semantics are the target. The proxy passes through the v3/v4/v5
            query_range APIs and variable endpoints without validating unknown fields, so upstream
            payloads evolve safely.
          </p>
          <p>
            The earlier route of copying the SigNoz frontend verbatim was abandoned: the dependency
            closure and provider-chain cost were too high and it conflicted with the theme extension
            goal. The vendor snapshot is read-only comparison material only, never built and never
            copied into the runtime.
          </p>
        </Section>

        <Section id="acceptance" eyebrow="Acceptance" title="Fixed smoke dashboards and a matrix">
          <p>
            Four dashboards on the test backend anchor the acceptance runs: a System Overview smoke
            dashboard, a Kubernetes dashboard with QUERY variables, tables and clickhouse panels, a
            Postgres dashboard with DYNAMIC variables, and an Elasticsearch dashboard with formulas.
          </p>
          <p>
            The matrix covers: no key with env default, wrong key, wrong id, full params and
            replaceState, upstream outage with self-healing retry, iframe-resizer wired or not, Chrome
            108, read-only enforcement, health and metrics without plaintext keys, dozens of panels,
            and unknown theme fallback.
          </p>
        </Section>

        <Section id="milestones" eyebrow="Timeline" title="Milestones">
          <div className="relative space-y-4 pl-6">
            <span className="absolute bottom-2 left-[7px] top-2 w-px bg-white/10" />
            {milestones.map((milestone) => (
              <div key={milestone.id} className="relative rounded-xl border border-white/10 bg-card p-5">
                <span
                  className={`absolute -left-6 top-6 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    milestone.status === "Done" ? "bg-emerald-400" : "bg-primary"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{milestone.id}</span>
                  <p className="text-sm font-semibold text-foreground">{milestone.title}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      milestone.status === "Done"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-primary/30 bg-primary/10 text-primary"
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{milestone.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="risks" eyebrow="Risks" title="Known risks and mitigations">
          <div className="grid gap-4 sm:grid-cols-2">
            {risks.map((item) => (
              <div key={item.risk} className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-card p-5">
                {item.risk.startsWith("Marketing") ? <BorderBeam size={160} duration={9} /> : null}
                <p className="text-sm font-semibold text-foreground">{item.risk}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.mitigation}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
