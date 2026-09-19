/**
 * Shadcn Calendar (react-day-picker range, mirroring the registry calendar shape,
 * classNames keyed for v10 parts; weekday names/titles localized via formatters, no date-fns needed).
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import type { EmbedLocale } from '@signoz-open-dashboard/shared';
import { cn } from './ui';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function SchnCalendar(props: {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  locale: EmbedLocale;
}): JSX.Element {
  const { range, onChange, locale } = props;
  return (
    <DayPicker
      mode="range"
      selected={range}
      onSelect={onChange}
      showOutsideDays
      classNames={{
        months: 'relative flex flex-col',
        month_caption: 'relative flex items-center justify-center py-1',
        caption_label: 'text-sm font-medium text-zinc-950 dark:text-zinc-50',
        nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between px-1',
        button_previous:
          'rounded-md border-0 bg-transparent p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900',
        button_next:
          'rounded-md border-0 bg-transparent p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900',
        weekdays: 'flex',
        weekday: 'flex-1 py-1 text-center text-[11px] text-zinc-400',
        month_grid: 'mt-1 w-full border-collapse',
        week: 'flex w-full',
        day: 'flex-1 p-0',
        day_button:
          'h-8 w-full rounded-md border-0 bg-transparent text-xs text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-900',
        selected:
          'bg-zinc-900 text-zinc-50 hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50',
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        range_middle: 'rounded-none bg-zinc-100 dark:bg-zinc-900',
        today: 'underline underline-offset-4',
        outside: 'opacity-40',
        footer: 'pt-2 text-[11px] text-zinc-400',
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />,
      }}
      formatters={{
        formatCaption: (date: Date) =>
          locale === 'zh'
            ? `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
            : `${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`,
        formatWeekdayName: (date: Date) =>
          (locale === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN)[date.getDay()],
      }}
    />
  );
}

export function withTime(base: Date | undefined, hour: string, minute: string, fallback: Date): Date {
  const d = base ? new Date(base) : new Date(fallback);
  d.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
  return d;
}

export function toHM(date: Date): { h: string; m: string } {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return { h: pad(date.getHours()), m: pad(date.getMinutes()) };
}
