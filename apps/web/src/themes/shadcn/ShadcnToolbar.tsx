/**
 * shadcn 工具条：标题 + 变量 + 时间（含自定义） + 刷新 + 深浅 + 语言 + 全屏。
 * 原生 select/details + tailwind（shadcn Native Select 形态），时区只展示 UTC 时间。
 * 各控制项支持 show/hidden/disabled（设计文档 §4.1）。
 */
import { Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { RELATIVE_PRESETS, resolveTimeRange } from '../../core/time';
import type { ToolbarProps } from '../types';
import { shadcnStrings } from './locale';
import { SchnButton, cn } from './ui';

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ShadcnToolbar(props: ToolbarProps): JSX.Element {
  if (!props.showToolbar) return <></>;
  const locale = props.locale ?? 'zh';
  const t = shadcnStrings(locale);
  const timeValue = props.relativeTime ?? 'custom';
  const varNames = Object.keys(props.variables);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const timeCtl = props.timeControl ?? 'show';
  const refreshCtl = props.refreshControl ?? 'show';
  const modeCtl = props.modeControl ?? 'show';
  const fullscreenCtl = props.fullscreenControl ?? 'show';
  const localeCtl = props.localeControl ?? 'show';

  const openCustom = (): void => {
    const { startMs, endMs } = resolveTimeRange({
      relativeTime: props.relativeTime,
      startTime: props.startTime,
      endTime: props.endTime,
    });
    setCustomStart(toLocalInput(startMs));
    setCustomEnd(toLocalInput(endMs));
    setCustomOpen(true);
  };

  const applyCustom = (): void => {
    const s = Math.floor(new Date(customStart).getTime() / 1000);
    const e = Math.floor(new Date(customEnd).getTime() / 1000);
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      props.onTimeChange({ startTime: s, endTime: e });
    }
    setCustomOpen(false);
  };

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

  const selectCls =
    'h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';
  const toggleGroupCls =
    'inline-flex items-center gap-0.5 rounded-md bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800';
  const toggleItemCls = (active: boolean): string =>
    cn(
      'rounded px-2 py-0.5 transition-colors disabled:opacity-50',
      active
        ? 'bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50'
        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
    );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      {props.showTitle ? <h1 className="mr-1 text-[15px] font-semibold text-zinc-950 dark:text-zinc-50">{props.title}</h1> : null}
      {varNames.map((name) => {
        const def = props.variables[name];
        const resolved = props.variableOptions?.[name] ?? [];
        const opts = resolved.length > 0 ? resolved.map(String) : [];
        const cur = valueFor(name);
        if (def?.multiSelect) {
          const arr = cur as string[];
          return (
            <details key={name} className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
                <span className="font-medium">
                  {arr.length === 0 ? '—' : arr.length <= 2 ? arr.join(', ') : `${arr[0]}, +${arr.length - 1}`}
                </span>
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-64 overflow-auto rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                {opts.map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={arr.includes(o)}
                      onChange={() => {
                        const next = arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o];
                        props.onVariableChange(name, next);
                      }}
                    />
                    <span className="truncate text-zinc-900 dark:text-zinc-100">{o}</span>
                  </label>
                ))}
              </div>
            </details>
          );
        }
        return (
          <label key={name} className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">{name}</span>
            <select
              className={cn(selectCls, 'max-w-[220px]')}
              value={cur as string}
              onChange={(e) => props.onVariableChange(name, e.target.value)}
            >
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <div className="ml-auto flex items-center gap-2">
        {timeCtl !== 'hidden' ? (
          <span className="inline-flex items-center gap-2">
            <select
              className={cn(selectCls, 'w-[150px]')}
              value={timeValue}
              disabled={timeCtl === 'disabled'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  openCustom();
                  return;
                }
                props.onTimeChange({ relativeTime: e.target.value });
              }}
            >
              {presetOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {customOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                <input
                  type="datetime-local"
                  className={cn(selectCls, 'border-0')}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span className="text-zinc-400">→</span>
                <input
                  type="datetime-local"
                  className={cn(selectCls, 'border-0')}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
                <SchnButton variant="default" onClick={applyCustom}>
                  {t.ok}
                </SchnButton>
                <SchnButton variant="ghost" onClick={() => setCustomOpen(false)}>
                  {t.cancel}
                </SchnButton>
              </span>
            ) : null}
          </span>
        ) : null}
        {refreshCtl !== 'hidden' ? (
          <select
            className={cn(selectCls, 'w-[110px]')}
            value={props.refresh === 'inherit' ? 'off' : props.refresh}
            disabled={refreshCtl === 'disabled'}
            onChange={(e) => props.onRefreshChange(e.target.value)}
          >
            {t.refreshOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
        {modeCtl !== 'hidden' && props.mode !== undefined && props.onModeChange ? (
          <span className={toggleGroupCls}>
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                disabled={modeCtl === 'disabled'}
                onClick={() => props.onModeChange?.(m)}
                className={toggleItemCls(props.mode === m)}
              >
                {m === 'light' ? t.light : t.dark}
              </button>
            ))}
          </span>
        ) : null}
        {localeCtl !== 'hidden' && props.onLocaleChange ? (
          <span className={toggleGroupCls}>
            {(['zh', 'en'] as const).map((l) => (
              <button
                key={l}
                disabled={localeCtl === 'disabled'}
                onClick={() => props.onLocaleChange?.(l)}
                className={toggleItemCls(locale === l)}
              >
                {l === 'zh' ? t.chinese : t.english}
              </button>
            ))}
          </span>
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
