/**
 * shadcn Calendar（react-day-picker range，对照 registry calendar 形态，
 * 按 v10 部件键写 classNames；周名/标题经 formatters 本地化，无需 date-fns）。
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
        nav: 'absolute right-0 flex items-center gap-1',
        button_previous:
          'rounded-md p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900',
        button_next:
          'rounded-md p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900',
        weekdays: 'flex',
        weekday: 'w-8 py-1 text-center text-[11px] text-zinc-400',
        month_grid: 'mt-1 border-collapse',
        week: 'flex',
        day: 'p-0',
        day_button:
          'h-8 w-8 rounded-md border-0 bg-transparent text-xs text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none dark:text-zinc-50 dark:hover:bg-zinc-900',
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
