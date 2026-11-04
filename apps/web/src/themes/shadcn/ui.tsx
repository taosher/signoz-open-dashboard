/**
 * Shadcn-style base primitives (hand-written equivalents, no full registry pull; behavior mirrors button/card/
 * native-select/table/skeleton). Dark mode via `dark:` variants (activated by `.schn-dark`).
 */
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

export function cn(...inputs: (string | undefined | false)[]): string {
  return twMerge(clsx(...inputs));
}

export function SchnButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost'; size?: 'sm' },
): JSX.Element {
  const { variant = 'outline', size = 'sm', className, ...rest } = props;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border-0 font-medium transition-colors',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-7 px-2.5 text-xs',
        variant === 'default' && 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
        variant === 'outline' &&
        'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900',
        variant === 'ghost' && 'border-0 bg-transparent text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900',
        className,
      )}
      {...rest}
    />
  );
}

export function SchnSelect(props: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cn(
        'h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function SchnInfoTip({ content }: { content: string }): JSX.Element {
  return (
    <span className="group relative inline-flex shrink-0" aria-label={content} tabIndex={0}>
      <span className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[12px] font-semibold leading-none text-zinc-500 outline-none dark:border-zinc-700 dark:text-zinc-400">
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-max max-w-[280px] -translate-x-1/2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left text-[11px] font-normal leading-4 text-zinc-900 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {content}
      </span>
    </span>
  );
}

export function SchnCard({ title, description, extra, children }: { title: ReactNode; description?: string; extra?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
        <div className="flex min-w-0 min-h-[24px] items-center gap-1">
          <h3 className="truncate text-[13px] font-semibold">{title}</h3>
          {description ? <SchnInfoTip content={description} /> : null}
        </div>
        {extra}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2">{children}</div>
    </div>
  );
}

export function SchnSkeleton(): JSX.Element {
  return (
    <div className="flex flex-1 animate-pulse flex-col gap-2 p-1">
      <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function SchnEmpty({ text }: { text: string }): JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
      {text}
    </div>
  );
}

/** Shadcn ScrollArea: thin scrollbars (for self-scrolling containers like table bodies). */
export function SchnScrollArea({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <ScrollAreaPrimitive.Root type="auto" className={cn('h-full w-full overflow-hidden', className)}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none p-px transition-colors"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}
