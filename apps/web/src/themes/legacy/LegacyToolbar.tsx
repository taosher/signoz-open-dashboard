/**
 * legacy 极简工具条：标题 + 变量下拉 + 时间选择 + 刷新 + 全屏。
 * 时区强制 UTC（设计文档 §7.3，只读显示）。
 */
import { Button, Segmented, Select, Space } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { RELATIVE_PRESETS } from '../../core/time';
import type { ToolbarProps } from '../types';

const REFRESH_OPTIONS = [
  { value: 'off', label: '关闭刷新' },
  { value: '30s', label: '30 秒' },
  { value: '1m', label: '1 分钟' },
  { value: '5m', label: '5 分钟' },
];

function varOptions(v: { selectedValue?: unknown; customValue?: string; textboxValue?: string; defaultValue?: string }): { value: string; label: string }[] {
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
  if (out.size === 0) out.set('', '全部');
  return [...out.entries()].map(([value, label]) => ({ value, label }));
}

export function LegacyToolbar(props: ToolbarProps): JSX.Element {
  if (!props.showToolbar) return <></>;
  const timeValue = props.relativeTime ?? 'custom';
  const varNames = Object.keys(props.variables);
  const optionsFor = (name: string): { value: string; label: string }[] => {
    const resolved = props.variableOptions?.[name];
    if (resolved && resolved.length > 0) {
      return resolved.map((x) => ({ value: String(x), label: String(x) }));
    }
    return varOptions(props.variables[name] ?? {});
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
        <Select
          size="small"
          style={{ width: 150 }}
          value={timeValue}
          options={
            props.relativeTime !== null
              ? RELATIVE_PRESETS.map((p) => ({ value: p.value, label: p.label }))
              : [{ value: 'custom', label: '自定义时段' }, ...RELATIVE_PRESETS.map((p) => ({ value: p.value, label: p.label }))]
          }
          onChange={(v) => {
            if (v === 'custom') return;
            props.onTimeChange({ relativeTime: v });
          }}
        />
        <Select
          size="small"
          style={{ width: 110 }}
          value={props.refresh === 'inherit' ? 'off' : props.refresh}
          options={REFRESH_OPTIONS}
          onChange={(v) => props.onRefreshChange(v)}
        />
        <span style={{ color: '#999', fontSize: 12 }}>UTC</span>
        {props.mode !== undefined && props.onModeChange ? (
          <Segmented
            size="small"
            value={props.mode}
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
            onChange={(v) => props.onModeChange?.(v === 'dark' ? 'dark' : 'light')}
          />
        ) : null}
        <Button size="small" icon={<FullscreenOutlined />} onClick={props.onFullscreen}>
          全屏
        </Button>
      </Space>
    </div>
  );
}
