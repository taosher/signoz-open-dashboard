/**
 * shadcn 工具条：标题 + 变量 + 时间（含自定义） + 刷新 + 深浅 + 语言 + 全屏。
 * 全部控件均为 shadcn 形态（radix Select/Popover/ToggleGroup/Checkbox），
 * 时区只展示 UTC 时间，不提供切换。各控制项支持 show/hidden/disabled。
 */
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { RELATIVE_PRESETS, resolveTimeRange } from '../../core/time';
import type { ToolbarProps } from '../types';
import { SchnCalendar, toHM, withTime } from './calendar';
import { shadcnStrings } from './locale';
import { SchnPopover, SchnPopoverContent, SchnPopoverTrigger, SchnToggleGroup, SchnCheckbox } from './primitives';
import { SchnSelectItem, SchnSelectRoot } from './select';
import { SchnButton, cn } from './ui';

/** 两位数字时间输入（shadcn 风格，无下拉浮层）。失焦时补零并钳制到合法范围。 */
function TimeNumberInput(props: { value: string; max: number; onChange: (v: string) => void }): JSX.Element {
  return (
    <input
      inputMode="numeric"
      maxLength={2}
      value={props.value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
        props.onChange(digits);
      }}
      onBlur={() => {
        const n = Math.max(0, Math.min(props.max, Number(props.value) || 0));
        props.onChange(String(n).padStart(2, '0'));
      }}
      className="h-7 w-[52px] rounded-md border border-zinc-200 bg-white px-1 text-center text-xs tabular-nums text-zinc-900 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
    />
  );
}

const inputCls =
  'h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';

export function ShadcnToolbar(props: ToolbarProps): JSX.Element {
  const locale = props.locale ?? 'zh';
  const t = shadcnStrings(locale);
  const varNames = Object.keys(props.variables);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [startHour, setStartHour] = useState('00');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('00');
  const [endMin, setEndMin] = useState('00');
  const [timeOpen, setTimeOpen] = useState(false);

  const timeCtl = props.timeControl ?? 'show';
  const refreshCtl = props.refreshControl ?? 'show';
  const modeCtl = props.modeControl ?? 'show';
  const fullscreenCtl = props.fullscreenControl ?? 'show';
  const localeCtl = props.localeControl ?? 'show';

  const openCustomDefaults = (): void => {
    const { startMs, endMs } = resolveTimeRange({
      relativeTime: props.relativeTime,
      startTime: props.startTime,
      endTime: props.endTime,
    });
    const s = new Date(startMs);
    const e = new Date(endMs);
    setRange({ from: s, to: e });
    const sh = toHM(s);
    const eh = toHM(e);
    setStartHour(sh.h);
    setStartMin(sh.m);
    setEndHour(eh.h);
    setEndMin(eh.m);
  };

  const applyCustom = (): void => {
    if (!range?.from || !range?.to) return;
    const s = withTime(range.from, startHour, startMin, new Date());
    const e = withTime(range.to, endHour, endMin, new Date());
    if (e.getTime() > s.getTime()) {
      props.onTimeChange({
        startTime: Math.floor(s.getTime() / 1000),
        endTime: Math.floor(e.getTime() / 1000),
      });
    }
    setTimeOpen(false);
  };

  const shortRange = (s: number, e: number): string => {
    const f = (ms: number): string => {
      const d = new Date(ms * 1000);
      const pad = (n: number): string => String(n).padStart(2, '0');
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    return `${f(s)} → ${f(e)}`;
  };

  const timeDisplay =
    props.relativeTime !== null
      ? (t.preset[props.relativeTime] ?? props.relativeTime)
      : props.startTime !== null && props.endTime !== null
        ? shortRange(props.startTime, props.endTime)
        : t.customRange;

  const presetOptions = [
    ...RELATIVE_PRESETS.map((p) => ({ value: p.value as string, label: t.preset[p.value] ?? p.label })),
    { value: 'custom', label: t.customRange },
  ];

  const valueFor = (name: string): string | string[] => {
    const def = props.variables[name];
    const cur = props.variableValues[name] ?? def?.selectedValue ?? '';
    if (def?.multiSelect) {
      return (Array.isArray(cur) ? cur : [cur]).map(String).filter((s) => s !== '');
    }
    return String(Array.isArray(cur) ? (cur[0] ?? '') : cur);
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      {props.showTitle ? <h1 className="mr-1 text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">{props.title}</h1> : null}
      {varNames.map((name) => {
        const def = props.variables[name];
        const resolved = props.variableOptions?.[name] ?? [];
        const opts = (resolved.length > 0 ? resolved.map(String) : []).filter((s) => s !== '');
        const cur = valueFor(name);
        if (def?.multiSelect) {
          const arr = cur as string[];
          return (
            <SchnPopover key={name}>
              <SchnPopoverTrigger>
                <button className={`${inputCls} inline-flex max-w-[320px] cursor-pointer items-center gap-1.5`}>
                  <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
                  <span className="truncate font-medium">
                    {arr.length === 0 ? '—' : arr.length <= 2 ? arr.join(', ') : `${arr[0]}, +${arr.length - 1}`}
                  </span>
                </button>
              </SchnPopoverTrigger>
              <SchnPopoverContent className="max-h-64 w-64 overflow-auto">
                {opts.map((o) => (
                  <SchnCheckbox
                    key={o}
                    label={o}
                    checked={arr.includes(o)}
                    onChange={() => {
                      const next = arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o];
                      props.onVariableChange(name, next);
                    }}
                  />
                ))}
              </SchnPopoverContent>
            </SchnPopover>
          );
        }
        return (
          <label key={name} className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
            <SchnSelectRoot
              className="max-w-[220px]"
              value={cur as string}
              onChange={(v) => props.onVariableChange(name, v)}
            >
              {opts.map((o) => (
                <SchnSelectItem key={o} value={o} label={o} />
              ))}
            </SchnSelectRoot>
          </label>
        );
      })}
      <div className="ml-auto flex items-center gap-2">
        {timeCtl !== 'hidden' ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.timeLabel}</span>
            <SchnPopover
              open={timeOpen}
              onOpenChange={(v) => {
                if (v) openCustomDefaults();
                setTimeOpen(v);
              }}
            >
              <SchnPopoverTrigger>
                <button
                  disabled={timeCtl === 'disabled'}
                  className={`${inputCls} inline-flex w-[190px] cursor-pointer items-center justify-between gap-1 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{timeDisplay}</span>
                  <ChevronDown size={13} className="shrink-0 opacity-50" />
                </button>
              </SchnPopoverTrigger>
              <SchnPopoverContent className="w-[348px]">
                <div className="grid grid-cols-2 gap-1">
                  {presetOptions
                    .filter((p) => p.value !== 'custom')
                    .map((p) => (
                      <button
                        key={p.value}
                        onClick={() => {
                          props.onTimeChange({ relativeTime: p.value });
                          setTimeOpen(false);
                        }}
                        className={cn(
                          'rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900',
                          props.relativeTime === p.value
                            ? 'bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50'
                            : 'text-zinc-600 dark:text-zinc-300',
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                </div>
                <div className="my-2 border-t border-zinc-100 dark:border-zinc-900" />
                <div className="mb-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{t.customRange}</div>
                <SchnCalendar range={range} onChange={setRange} locale={locale} />
                <div className="mt-2 flex items-center gap-3">
                  <TimeNumberInput value={startHour} max={23} onChange={setStartHour} />
                  <span className="text-zinc-400">:</span>
                  <TimeNumberInput value={startMin} max={59} onChange={setStartMin} />
                  <span className="shrink-0 text-zinc-400">→</span>
                  <TimeNumberInput value={endHour} max={23} onChange={setEndHour} />
                  <span className="text-zinc-400">:</span>
                  <TimeNumberInput value={endMin} max={59} onChange={setEndMin} />
                </div>
                <SchnButton variant="default" className="mt-2 w-full" onClick={applyCustom}>
                  {t.ok}
                </SchnButton>
              </SchnPopoverContent>
            </SchnPopover>
          </span>
        ) : null}
        {refreshCtl !== 'hidden' ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.refreshLabel}</span>
            <SchnSelectRoot
              className="w-[110px]"
              value={props.refresh === 'inherit' ? 'off' : props.refresh}
              disabled={refreshCtl === 'disabled'}
              onChange={(v) => props.onRefreshChange(v)}
            >
              {t.refreshOptions.map((o) => (
                <SchnSelectItem key={o.value} value={o.value} label={o.label} />
              ))}
            </SchnSelectRoot>
          </span>
        ) : null}
        {modeCtl !== 'hidden' && props.mode !== undefined && props.onModeChange ? (
          <SchnToggleGroup
            value={props.mode}
            disabled={modeCtl === 'disabled'}
            onChange={(m) => props.onModeChange?.(m)}
            options={[
              { value: 'light', label: t.light },
              { value: 'dark', label: t.dark },
            ]}
          />
        ) : null}
        {localeCtl !== 'hidden' && props.onLocaleChange ? (
          <SchnToggleGroup
            value={locale}
            disabled={localeCtl === 'disabled'}
            onChange={(l) => props.onLocaleChange?.(l)}
            options={[
              { value: 'zh', label: t.chinese },
              { value: 'en', label: t.english },
            ]}
          />
        ) : null}
        {fullscreenCtl !== 'hidden' ? (
          <SchnButton disabled={fullscreenCtl === 'disabled'} onClick={() => props.onFullscreenToggle?.()}>
            {props.isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {props.isFullscreen ? t.exitFullscreen : t.fullscreen}
          </SchnButton>
        ) : null}
      </div>
    </div>
  );
}
