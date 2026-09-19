/**
 * shadcn 风格基础原语（手写等价类，不拖 registry 全量；行为对标 button/card/
 * native-select/table/skeleton）。深色经 `dark:` 变体（`.schn-dark` 生效）。
 */
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

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
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-7 px-2.5 text-xs',
        variant === 'default' && 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
        variant === 'outline' &&
          'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900',
        variant === 'ghost' && 'text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900',
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

export function SchnCard({ title, extra, children }: { title: ReactNode; extra?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
        <h3 className="truncate text-[13px] font-semibold">{title}</h3>
        {extra}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2">{children}</div>
    </div>
  );
}

export function SchnSkeleton(): JSX.Element {
  return (
    <div className="flex min-h-[120px] flex-1 animate-pulse flex-col gap-2 p-1">
      <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function SchnEmpty({ text }: { text: string }): JSX.Element {
  return (
    <div className="flex min-h-[120px] flex-1 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
      {text}
    </div>
  );
}
