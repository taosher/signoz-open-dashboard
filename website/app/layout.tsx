import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ScrollProgress } from "@/components/ui/scroll-progress";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Live SigNoz dashboards, embedded anywhere · signoz-open-dashboard",
    template: "%s · signoz-open-dashboard",
  },
  description:
    "Serve any SigNoz dashboard as a portable, read-only, always-live widget. One iframe line, no login for viewers, write APIs denied by design.",
  keywords: [
    "SigNoz",
    "dashboard",
    "embed",
    "iframe",
    "observability",
    "read-only",
    "NestJS",
    "open source",
  ],
  openGraph: {
    title: "Live SigNoz dashboards, embedded anywhere",
    description:
      "Embed live SigNoz dashboards anywhere an iframe can go. Read-only by design, URL-driven, two themes.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ScrollProgress className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-primary" />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
