import { GithubIcon } from "@/components/icons";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/docs", label: "Docs" },
  { href: "/design", label: "Design" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            signoz-open-dashboard
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/taosher/signoz-open-dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-white/5 px-6 py-2 text-sm text-muted-foreground md:hidden">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="whitespace-nowrap hover:text-foreground">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
