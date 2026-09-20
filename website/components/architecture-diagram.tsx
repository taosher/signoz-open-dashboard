"use client";

import { useRef, type RefObject } from "react";
import { Database, Globe, LayoutDashboard, Server, type LucideIcon } from "lucide-react";

import { AnimatedBeam } from "@/components/ui/animated-beam";

interface NodeProps {
  innerRef: RefObject<HTMLDivElement | null>;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

function Node({ innerRef, icon: Icon, title, subtitle }: NodeProps) {
  return (
    <div
      ref={innerRef}
      className="z-10 flex w-28 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-card px-3 py-4 text-center shadow-[0_0_40px_-12px_rgba(249,115,22,0.35)] sm:w-40"
    >
      <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
      <p className="text-xs font-semibold sm:text-sm">{title}</p>
      <p className="text-[10px] leading-4 text-muted-foreground sm:text-xs">{subtitle}</p>
    </div>
  );
}

export function ArchitectureDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const webRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HTMLDivElement>(null);
  const signozRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center justify-between gap-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:gap-2 sm:p-10"
    >
      <Node
        innerRef={siteRef}
        icon={Globe}
        title="Your site"
        subtitle="Portal, product, NOC wall"
      />
      <Node
        innerRef={webRef}
        icon={LayoutDashboard}
        title="Embed app"
        subtitle="/embed/:dashboardId"
      />
      <Node innerRef={apiRef} icon={Server} title="NestJS proxy" subtitle="/api/signoz/* :8080" />
      <Node innerRef={signozRef} icon={Database} title="SigNoz" subtitle="Query service 0.97.0" />

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={siteRef}
        toRef={webRef}
        duration={4}
        pathColor="#52525b"
        gradientStartColor="#fb923c"
        gradientStopColor="#f97316"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={webRef}
        toRef={apiRef}
        duration={4}
        delay={0.4}
        pathColor="#52525b"
        gradientStartColor="#f97316"
        gradientStopColor="#fdba74"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={apiRef}
        toRef={signozRef}
        duration={4}
        delay={0.8}
        pathColor="#52525b"
        gradientStartColor="#fdba74"
        gradientStopColor="#f97316"
      />
    </div>
  );
}
