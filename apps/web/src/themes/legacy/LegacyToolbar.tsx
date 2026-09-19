/**
 * legacy 极简工具条：标题 + 变量下拉 + 时间选择（含自定义） + 刷新 +
 * 深浅色 + 语言 + 全屏切换。时区强制 UTC（只展示 UTC 时间，不提供切换）。
 * 各控制项支持 show/hidden/disabled（设计文档 §4.1）。
 */
import { Button, DatePicker, Modal, Segmented, Select, Space } from 'antd';
import { Maximize2, Minimize2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { RELATIVE_PRESETS, resolveTimeRange } from '../../core/time';
import type { ToolbarProps } from '../types';
import { legacyStrings } from './locale';

function varOptions(
  v: { selectedValue?: unknown; customValue?: string; textboxValue?: string; defaultValue?: string },
  allLabel: string,
): { value: string; label: string }[] {
  const out = new Map<string, string>();
  const push = (x: unknown): void => {
    if (x === null || x === undefined) return;
    for (const s of Array.isArray(x) ? x : [x]) {
      const str = String(s);
      if (!out.has(str)) out.set(str, str);
    }
  };
  push(v.selectedValue);
  push(v.defaultValue);
  if (typeof v.customValue === 'string' && v.customValue !== '') {
    for (const s of v.customValue.split(',')) {
      const t = s.trim();
      if (t !== '') out.set(t, t);
    }
  }
  if (typeof v.textboxValue === 'string' && v.textboxValue !== '') out.set(v.textboxValue, v.textboxValue);
  if (out.size === 0) out.set('', allLabel);
  return [...out.entries()].map(([value, label]) => ({ value, label }));
}

export function LegacyToolbar(props: ToolbarProps): JSX.Element {
  if (!props.showToolbar) return <></>;
  const locale = props.locale ?? 'zh';
  const t = legacyStrings(locale);
  const timeValue = props.relativeTime ?? 'custom';
  const varNames = Object.keys(props.variables);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

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
    setCustomValue([dayjs(startMs), dayjs(endMs)]);
    setCustomOpen(true);
  };

  const presetOptions = [
    ...RELATIVE_PRESETS.map((p) => ({ value: p.value as string, label: t.preset[p.value] ?? p.label })),
    { value: 'custom', label: t.customRange },
  ];

  const optionsFor = (name: string): { value: string; label: string }[] => {
    const resolved = props.variableOptions?.[name];
    if (resolved && resolved.length > 0) {
      return resolved.map((x) => ({ value: String(x), label: String(x) }));
    }
    return varOptions(props.variables[name] ?? {}, t.all);
  };
  const valueFor = (name: string): string | string[] => {
    const def = props.variables[name];
    const cur = props.variableValues[name] ?? def?.selectedValue ?? '';
    if (def?.multiSelect) {
      return (Array.isArray(cur) ? cur : [cur]).map(String).filter((s) => s !== '');
    }
    return String(Array.isArray(cur) ? (cur[0] ?? '') : cur);
  };
  const dark = props.mode === 'dark';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: dark ? '1px solid #303030' : '1px solid #eee',
        background: dark ? '#141414' : '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexWrap: 'wrap',
      }}
    >
      {props.showTitle ? (
        <strong style={{ fontSize: 15, marginRight: 4 }}>{props.title}</strong>
      ) : null}
      {varNames.map((name) => (
        <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#666', fontSize: 12 }}>{name}</span>
          <Select
            size="small"
            mode={props.variables[name]?.multiSelect ? 'multiple' : undefined}
            maxTagCount={2}
            style={{ minWidth: 120, maxWidth: 320 }}
            value={valueFor(name)}
            options={optionsFor(name)}
            onChange={(v) => props.onVariableChange(name, v)}
          />
        </span>
      ))}
      <Space style={{ marginLeft: 'auto' }} size="small">
        {timeCtl !== 'hidden' ? (
          <>
            <Select
              size="small"
              style={{ width: 150 }}
              value={timeValue}
              disabled={timeCtl === 'disabled'}
              options={presetOptions}
              onChange={(v) => {
                if (v === 'custom') {
                  openCustom();
                  return;
                }
                props.onTimeChange({ relativeTime: v });
              }}
            />
            <Modal
              title={t.customTitle}
              open={customOpen}
              okText={t.ok}
              cancelText={t.cancel}
              onCancel={() => setCustomOpen(false)}
              onOk={() => {
                if (customValue) {
                  props.onTimeChange({
                    startTime: Math.floor(customValue[0].valueOf() / 1000),
                    endTime: Math.floor(customValue[1].valueOf() / 1000),
                  });
                }
                setCustomOpen(false);
              }}
            >
              <DatePicker.RangePicker
                showTime
                style={{ width: '100%' }}
                value={customValue}
                onChange={(v) => setCustomValue((v ?? null) as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              />
            </Modal>
          </>
        ) : null}
        {refreshCtl !== 'hidden' ? (
          <Select
            size="small"
            style={{ width: 110 }}
            value={props.refresh === 'inherit' ? 'off' : props.refresh}
            disabled={refreshCtl === 'disabled'}
            options={t.refreshOptions}
            onChange={(v) => props.onRefreshChange(v)}
          />
        ) : null}
        {modeCtl !== 'hidden' && props.mode !== undefined && props.onModeChange ? (
          <Segmented
            size="small"
            value={props.mode}
            disabled={modeCtl === 'disabled'}
            options={[
              { value: 'light', label: t.light },
              { value: 'dark', label: t.dark },
            ]}
            onChange={(v) => props.onModeChange?.(v === 'dark' ? 'dark' : 'light')}
          />
        ) : null}
        {localeCtl !== 'hidden' && props.onLocaleChange ? (
          <Segmented
            size="small"
            value={locale}
            disabled={localeCtl === 'disabled'}
            options={[
              { value: 'zh', label: t.chinese },
              { value: 'en', label: t.english },
            ]}
            onChange={(v) => props.onLocaleChange?.(v === 'en' ? 'en' : 'zh')}
          />
        ) : null}
        {fullscreenCtl !== 'hidden' ? (
          <Button
            size="small"
            disabled={fullscreenCtl === 'disabled'}
            icon={props.isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            onClick={() => props.onFullscreenToggle?.()}
          >
            {props.isFullscreen ? t.exitFullscreen : t.fullscreen}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
