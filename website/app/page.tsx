import {
  Activity,
  ChevronDown,
  Code2,
  Eye,
  FileSearch,
  Gauge,
  KeyRound,
  Layers,
  Link2,
  Lock,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tv,
  Workflow,
} from "lucide-react";

import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { CodeBlock } from "@/components/code-block";
import { GithubIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";
import { Meteors } from "@/components/ui/meteors";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedSpan, Terminal, TypingAnimation } from "@/components/ui/terminal";

const stats = [
  { value: 1, label: "iframe line to embed", suffix: "" },
  { value: 2, label: "themes: shadcn + legacy", suffix: "" },
  { value: 0, label: "write APIs proxied", suffix: "" },
  { value: 100, label: "read-only surface", suffix: "%" },
];

const capabilities = [
  "one-line embed",
  "always live",
  "read-only",
  "URL-driven view",
  "key flexibility",
  "friendly empty states",
  "two themes",
  "variable overrides",
  "auto-resize",
  "health + metrics",
  "public iframe",
  "no login for viewers",
];

const features = [
  {
    icon: Link2,
    title: "One-line embed",
    body: "GET /embed/:dashboardId renders the toolbar plus the dashboard grid. Callers only build a URL, no SDK and no build step.",
  },
  {
    icon: RefreshCw,
    title: "Always live, never stale",
    body: "Every load and refresh streams straight from your SigNoz backend. No exports, no screenshots, no scheduled sync jobs.",
  },
  {
    icon: ShieldCheck,
    title: "Read-only by design",
    body: "No edit, clone, delete, settings, lock or alert UI. Dashboard writes and every non-allowlisted API return 403.",
  },
  {
    icon: KeyRound,
    title: "Key flexibility",
    body: "Effective key = x-embed-api-key ?? env.SIGNOZ_API_KEY. A missing or wrong key renders a friendly empty state, never a stack trace.",
  },
  {
    icon: Layers,
    title: "Two themes, one contract",
    body: "shadcn (Tailwind + Recharts) and legacy (antd + ECharts) implement the same ThemeModule contract. Unknown values fall back to shadcn.",
  },
  {
    icon: Gauge,
    title: "Observable by default",
    body: "GET /healthz and GET /metrics, plus JSON logs that record only the key source and an 8-char hash, never the plaintext key.",
  },
];

const useCases = [
  {
    name: "Customer-facing status & SLA pages",
    description:
      "Show live health, latency and usage on your support portal without giving customers console access.",
    Icon: Activity,
    className: "md:col-span-2",
    href: "/docs#embed-url",
    cta: "See embed parameters",
  },
  {
    name: "In-product analytics",
    description: "Put real operational charts inside an admin panel, settings page or partner portal.",
    Icon: MonitorPlay,
    className: "md:col-span-1",
  },
  {
    name: "Ops & NOC walls",
    description:
      "Kiosk-ready chrome toggles (title, toolbar, fullscreen) turn any dashboard into a big-screen view.",
    Icon: Tv,
    className: "md:col-span-1",
  },
  {
    name: "Reports & reviews",
    description:
      "Time range, variables and refresh interval all live in the URL, so every shared link reproduces the exact same view.",
    Icon: FileSearch,
    className: "md:col-span-2",
    href: "/docs#embed-url",
    cta: "Every view is a link",
  },
];

const principles = [
  {
    icon: Code2,
    title: "Docs-first",
    body: "docs/product-tech-design.md is the single source of truth: design changes update the document before the code.",
  },
  {
    icon: Lock,
    title: "Default deny",
    body: "The proxy is an allowlist of read-only routes. Everything else under /api/* returns 403 and is never forwarded.",
  },
  {
    icon: KeyRound,
    title: "Keys in memory only",
    body: "The URL key stays in memory, never localStorage or cookies. Logs keep the key source and an 8-char hash only.",
  },
  {
    icon: Workflow,
    title: "Theme plugins",
    body: "A new theme adds themes/<name>/ plus one registry line. core/ stays untouched, so the contract cannot sprawl.",
  },
];

const faqs = [
  {
    q: "Do viewers need a SigNoz account?",
    a: "No. The iframe renders the dashboard without a login page. Data access is authorized by an API key injected server-side by the proxy.",
  },
  {
    q: "Can someone edit or delete my dashboard through the embed?",
    a: "No. Dashboard PUT/POST/DELETE, /lock, and rules/alerts/user/org endpoints are blocked with 403. The frontend implements no editing entries.",
  },
  {
    q: "Can one dashboard serve different customers, regions or tiers?",
    a: "Yes. var-<name> query params override dashboard variable defaults, so a single dashboard can be re-scoped per link.",
  },
  {
    q: "Is putting an API key in the URL safe?",
    a: "Treat it as sensitive: URLs end up in browser history, proxy logs and referers. Use short-lived, read-only keys and rotate on leak. Prefer the env default key when the embed origin is trusted.",
  },
  {
    q: "Which SigNoz versions are supported?",
    a: "SigNoz v0.97.0 query semantics are pinned. The proxy passes through the v3/v4/v5 query_range APIs and the variables APIs without validating unknown fields.",
  },
  {
    q: "Can I ship my own theme?",
    a: "Yes. Implement the ThemeModule contract (Tokens, Toolbar, WidgetCard, ErrorState), register it with one line, and select it with ?theme=<name>.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <AnimatedGridPattern
          numSquares={40}
          maxOpacity={0.12}
          duration={3}
          repeatDelay={1}
          className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_72%)] absolute inset-0 h-full w-full text-zinc-500"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="min-w-0">
            <BlurFade delay={0.05} inView>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <AnimatedShinyText>Read-only · public iframe · one URL</AnimatedShinyText>
              </span>
            </BlurFade>
            <BlurFade delay={0.1} inView>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Embed live <AuroraText colors={["#f97316", "#fdba74", "#fb923c", "#f59e0b"]}>SigNoz dashboards</AuroraText> anywhere an iframe can go.
              </h1>
            </BlurFade>
            <BlurFade delay={0.15} inView>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
                Your metrics already live in SigNoz. Your users do not. This project serves every
                dashboard as a portable, read-only, always-live widget for portals, product pages,
                NOC walls and reports.
              </p>
            </BlurFade>
            <BlurFade delay={0.2} inView>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Built for
                <Marquee className="max-w-xs [--duration:22s] [--gap:0.75rem]" pauseOnHover>
                  {["status pages", "admin panels", "NOC walls", "weekly reports", "partner portals"].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground"
                      >
                        {item}
                      </span>
                    ),
                  )}
                </Marquee>
              </div>
            </BlurFade>
            <BlurFade delay={0.25} inView>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a href="/docs">
                  <ShimmerButton className="px-6 py-3 text-sm font-medium">
                    Read the docs
                  </ShimmerButton>
                </a>
                <a
                  href="https://github.com/taosher/signoz-open-dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10"
                >
                  <GithubIcon className="h-4 w-4" />
                  Star on GitHub
                </a>
              </div>
            </BlurFade>
          </div>

          <BlurFade className="min-w-0" delay={0.3} inView>
            <div className="space-y-4">
              <Terminal className="max-w-none" startOnView>
                <TypingAnimation>{`$ docker run -p 8080:8080 \\`}</TypingAnimation>
                <TypingAnimation>{`    -e SIGNOZ_BASE_URL=http://signoz:30303 \\`}</TypingAnimation>
                <TypingAnimation>{`    -e SIGNOZ_API_KEY=<read-only-key> \\`}</TypingAnimation>
                <TypingAnimation>{`    your-org/signoz-open-dashboard:latest`}</TypingAnimation>
                <AnimatedSpan className="text-emerald-400">
                  {`✔ listening on :8080`}
                </AnimatedSpan>
                <AnimatedSpan className="text-muted-foreground">
                  {`✔ allowlist loaded: dashboards GET + query_range v3/v4/v5`}
                </AnimatedSpan>
                <AnimatedSpan className="text-muted-foreground">
                  {`✔ writes and everything else -> 403`}
                </AnimatedSpan>
              </Terminal>
              <CodeBlock
                language="html"
                code={`<iframe
  src="https://embed.example.com/embed/<dashboardId>?relativeTime=30m&theme=shadcn&mode=light"
  style="width:100%;border:0"
  allowfullscreen>
</iframe>`}
              />
            </div>
          </BlurFade>
        </div>
      </section>

      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                <NumberTicker value={stat.value} />
                {stat.suffix}
              </p>
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="What you get"
          title="Everything a shared dashboard needs, nothing that can break it"
          description="The embed app, the proxy and the URL spec are built as one read-only product. Views are links, data is always fresh, and the write surface simply does not exist."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <BlurFade key={feature.title} delay={index * 0.05} inView>
              <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-card p-6">
                {index === 0 ? <BorderBeam size={180} duration={9} /> : null}
                <feature.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </div>
            </BlurFade>
          ))}
        </div>
        <div className="mt-10">
          <Marquee className="[--duration:36s]" pauseOnHover>
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground"
              >
                {capability}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="Use cases"
          title="One embed origin, many audiences"
          description="The same deployment serves customer portals, internal tools and big screens. Only the URL changes."
        />
        <BentoGrid className="mt-12">
          {useCases.map((useCase) => (
            <BentoCard
              key={useCase.name}
              name={useCase.name}
              description={useCase.description}
              Icon={useCase.Icon}
              className={useCase.className}
              href={useCase.href}
              cta={useCase.cta}
              background={
                useCase.Icon === Activity ? (
                  <DotPattern className="text-zinc-500/80 [mask-image:radial-gradient(320px_circle_at_30%_20%,white,transparent)]" />
                ) : (
                  <div className="surface-grid absolute inset-0 opacity-60" />
                )
              }
            />
          ))}
        </BentoGrid>
      </section>

      <section id="architecture" className="border-y border-white/5 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <SectionHeading
            eyebrow="Architecture"
            title="Static HTML in, streamed queries out"
            description="One container serves the embed app and proxies the SigNoz API. The browser never talks to SigNoz directly and never holds a backend address."
          />
          <div className="mt-12">
            <ArchitectureDiagram />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-card p-5 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">1. Parse in memory.</span> The web app
              reads the URL into an auth context and keeps the key in memory. Nothing is written to
              localStorage or cookies.
            </div>
            <div className="rounded-xl border border-white/10 bg-card p-5 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">2. Same-origin calls.</span> Panels post
              to /api/signoz/* with an x-embed-api-key header, cancelled client-side via AbortSignal.
            </div>
            <div className="rounded-xl border border-white/10 bg-card p-5 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">3. Proxy injects and streams.</span>{" "}
              NestJS injects SIGNOZ-API-KEY, strips inbound auth headers and streams the response back
              with a request id.
            </div>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock
              language="text"
              code={`ALL /api/signoz/*  ->  SIGNOZ_BASE_URL + path + query

GET   /api/v1/dashboards/:id      pass through
POST  /api/v3|v4|v5/query_range   pass through
POST  /api/v5/substitute_vars     pass through
POST  /api/v2/variables/query     pass through
GET   /api/v1/fields/values       pass through
GET   /api/v1/version|features    pass through
*     everything else             403`}
            />
            <div className="rounded-xl border border-white/10 bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                Friendly empty states
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Missing key, invalid key, unknown dashboard, upstream outage and blocked writes map to
                typed EMBED_* error codes, each rendered as an empty state with Retry where it makes
                sense.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[
                  "401 missing key",
                  "401 invalid key",
                  "404 not found",
                  "502 upstream",
                  "403 read-only",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="Design principles"
          title="Read-only is not a feature, it is the architecture"
          description="Four rules keep the project safe to put in front of strangers and cheap to extend."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((principle, index) => (
            <BlurFade key={principle.title} delay={index * 0.05} inView>
              <div className="h-full rounded-xl border border-white/10 bg-card p-6">
                <principle.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.body}</p>
              </div>
            </BlurFade>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a href="/design" className="text-sm font-medium text-primary hover:underline">
            Read the full design rationale
          </a>
        </div>
      </section>

      <section id="faq" className="border-t border-white/5 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-3xl px-6">
          <SectionHeading eyebrow="FAQ" title="Questions owners ask before embedding" />
          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/10 bg-card p-5 open:border-white/20"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <Meteors number={18} />
        <div className="relative mx-auto w-full max-w-3xl px-6 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ship a live dashboard this afternoon
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Point the container at your SigNoz backend, copy the iframe line, and your customers get
            charts instead of screenshots.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="/docs">
              <ShimmerButton className="px-6 py-3 text-sm font-medium">Get started</ShimmerButton>
            </a>
            <a
              href="/design"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              Design principles
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
