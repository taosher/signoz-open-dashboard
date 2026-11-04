/**
 * Native-style drill-down context menu (shadcn theme).
 *
 * Port of SigNoz `DrilldownAggregateMenu`: a tinted header (signal + clicked label), the panel's
 * context links, and the extra actions the embed can actually perform in place. Native's
 * "View in Logs / View in Traces / Breakout" all leave to a full explorer page, which an iframe
 * embed deliberately does not do — instead links may point at another dashboard, which is opened
 * in place (see `core/drilldownNav.ts`).
 */
import { useEffect, useRef } from 'react';
import { shortTime } from '../../signoz/formatTime';
import type { DrilldownMenuProps } from '../types';
import { shadcnStrings } from './locale';

function MenuRow(props: {
  icon: string;
  label: string;
  hint?: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      title={props.hint}
      onClick={props.onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      <span className="w-4 shrink-0 text-center text-zinc-400">{props.icon}</span>
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
    </button>
  );
}

export function DrilldownMenu(props: DrilldownMenuProps): JSX.Element | null {
  const { payload, panelTitle, locale, onLink, onClose } = props;
  const t = shadcnStrings(locale ?? 'zh');
  const ref = useRef<HTMLDivElement>(null);
  const { context, links = [] } = payload;

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (links.length === 0) return null;

  const width = 260;
  const height = 92 + links.length * 30;
  const { x, y } = payload.coordinates;
  const left = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8));
  const top = y + height > window.innerHeight ? Math.max(8, y - height) : y;

  return (
    <>
      <div className="fixed inset-0 z-[90]" aria-hidden />
      <div
        ref={ref}
        role="menu"
        className="fixed z-[100] w-[260px] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        style={{ left, top }}
      >
        <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">
            {t.drilldownSignal[context.signal] ?? context.signal}
          </div>
          <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {context.label ?? panelTitle}
          </div>
          {context.filters.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {context.filters.map((filter) => (
                <span
                  key={`${filter.filterKey}-${filter.filterValue}`}
                  className="max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {filter.filterKey} = {String(filter.filterValue)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="p-1">
          {links.map((link) => (
            <MenuRow
              key={link.id}
              icon="↗"
              label={link.label}
              hint={link.tooltip}
              onClick={() => onLink(link)}
            />
          ))}
        </div>
        <div className="border-t border-zinc-100 px-3 py-1.5 text-[10px] text-zinc-400 dark:border-zinc-900">
          {t.drilldownWindow}: {formatWindow(context.timeRange)}
        </div>
      </div>
    </>
  );
}

function formatWindow(range?: { startTime: number; endTime: number }): string {
  if (!range) return '—';
  // The context carries epoch seconds; the formatter takes milliseconds.
  return `${shortTime(range.startTime * 1000)} ~ ${shortTime(range.endTime * 1000)}`;
}
