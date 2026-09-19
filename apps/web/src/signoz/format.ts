/**
 * Unit formatting (custom implementation covering the common subset of the SigNoz grafana unit system).
 * Covers the smoke dashboard's `percentunit/bytes/none`; other units output the raw number.
 */
export function formatValue(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return '-';
  const u = (unit ?? '').trim();
  if (u === 'percentunit') return `${trimNum(value * 100)}%`;
  if (u === 'percent') return `${trimNum(value)}%`;
  if (u === 'bytes' || u === 'decbytes' || u === 'bits') return formatBytes(value);
  if (u === '' || u === 'none' || u === 'short') return trimNum(value);
  return `${trimNum(value)} ${u}`;
}

function trimNum(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : 4;
  return String(Number(v.toFixed(digits)));
}

function formatBytes(v: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let x = Math.abs(v);
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  const sign = v < 0 ? '-' : '';
  return `${sign}${trimNum(x)} ${units[i]}`;
}

export function formatAxisTick(value: number, unit?: string): string {
  return formatValue(value, unit);
}
