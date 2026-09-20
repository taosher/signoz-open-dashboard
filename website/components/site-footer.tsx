const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#architecture", label: "Architecture" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Docs",
    links: [
      { href: "/docs", label: "Getting started" },
      { href: "/docs#embed-url", label: "Embed URL" },
      { href: "/docs#proxy-matrix", label: "Proxy matrix" },
      { href: "/docs#configuration", label: "Configuration" },
    ],
  },
  {
    title: "Design",
    links: [
      { href: "/design", label: "Principles" },
      { href: "/design#security", label: "Security model" },
      { href: "/design#themes", label: "Theme plugins" },
      { href: "/design#milestones", label: "Milestones" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "https://github.com/taosher/signoz-open-dashboard", label: "GitHub" },
      {
        href: "https://github.com/taosher/signoz-open-dashboard/blob/main/README.md",
        label: "README",
      },
      {
        href: "https://github.com/taosher/signoz-open-dashboard/blob/main/docs/product-tech-design.md",
        label: "Design document",
      },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-background">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-6">
        <div className="col-span-2">
          <p className="text-sm font-semibold">signoz-open-dashboard</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Turn SigNoz into a universal embedded business dashboard. Read-only, always live, one
            iframe line.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {column.title}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-6 py-6">
        <p className="mx-auto w-full max-w-6xl text-xs leading-5 text-muted-foreground">
          Independent open-source project. Not affiliated with SigNoz, Inc. SigNoz is a trademark of
          its respective owner. Built with NestJS, Vite, React and vinext.
        </p>
      </div>
    </footer>
  );
}
