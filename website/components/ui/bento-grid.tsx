import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[20rem] grid-cols-1 gap-4 md:grid-cols-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon: ElementType;
  description: string;
  href?: string;
  cta?: string;
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-card transform-gpu",
        "shadow-[0_-20px_80px_-20px_#ffffff14_inset] transition-colors duration-300 hover:border-white/20",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">{background}</div>
      <div className="relative z-10 flex h-full flex-col justify-end p-6">
        <div className="flex flex-col gap-2 transition-all duration-300 lg:group-hover:-translate-y-6">
          <Icon className="h-9 w-9 text-primary transition-transform duration-300 group-hover:scale-90" />
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {href && cta ? (
          <a
            href={href}
            className="pointer-events-auto mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-80 transition-opacity hover:opacity-100"
          >
            {cta}
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
