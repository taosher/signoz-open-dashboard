/**
 * 时间语义（设计文档 §4.1 / §7.4-4）。默认 `now-30m~now` UTC。
 * 原生参数 `relativeTime`（如 `30m`）或 `startTime+endTime`（epoch 秒）。
 */
import type { ParsedEmbedParams } from '@signoz-open-dashboard/shared';

export interface TimeRange {
  startMs: number;
  endMs: number;
}

export const RELATIVE_PRESETS = [
  { value: '5m', label: '最近 5 分钟' },
  { value: '15m', label: '最近 15 分钟' },
  { value: '30m', label: '最近 30 分钟' },
  { value: '1h', label: '最近 1 小时' },
  { value: '6h', label: '最近 6 小时' },
  { value: '1d', label: '最近 1 天' },
  { value: '3d', label: '最近 3 天' },
  { value: '1w', label: '最近 1 周' },
  { value: '1month', label: '最近 1 月' },
] as const;

const REL_RE = /^(\d+)(s|m|h|d|w|month|months)$/;

export function relativeToMs(relativeTime: string, nowMs = Date.now()): TimeRange {
  const m = REL_RE.exec(relativeTime.trim());
  if (!m) return { startMs: nowMs - 30 * 60 * 1000, endMs: nowMs };
  const n = Number(m[1]);
  const unit = m[2];
  const per =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60 * 1000
        : unit === 'h'
          ? 3600 * 1000
          : unit === 'd'
            ? 24 * 3600 * 1000
            : unit === 'w'
              ? 7 * 24 * 3600 * 1000
              : 30 * 24 * 3600 * 1000;
  return { startMs: nowMs - n * per, endMs: nowMs };
}

export function resolveTimeRange(p: Pick<ParsedEmbedParams, 'relativeTime' | 'startTime' | 'endTime'>, nowMs = Date.now()): TimeRange {
  if (p.relativeTime !== null) return relativeToMs(p.relativeTime, nowMs);
  if (p.startTime !== null && p.endTime !== null) {
    return { startMs: p.startTime * 1000, endMs: p.endTime * 1000 };
  }
  return { startMs: nowMs - 30 * 60 * 1000, endMs: nowMs };
}

/** refresh（`off`/`30s`/`1m`…）转轮询毫秒数；`off`/`inherit` 返回 null（不轮询）。 */
export function refreshToMs(refresh: string): number | null {
  if (refresh === 'off' || refresh === 'inherit') return null;
  const m = /^(\d+)(s|m|h)?$/.exec(refresh.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  const ms = unit === 'h' ? n * 3600 * 1000 : unit === 'm' ? n * 60 * 1000 : n * 1000;
  return ms >= 10_000 ? ms : 10_000;
}
