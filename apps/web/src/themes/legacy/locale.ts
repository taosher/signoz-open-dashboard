/**
 * Legacy theme en/zh copy (`locale` decided by URL/switcher, core does not dictate it, see design doc §4.1).
 * Dashboard data (titles/variable names) follows upstream and is never translated here.
 */
import type { EmbedErrorCode, EmbedLocale } from '@signoz-open-dashboard/shared';

export interface LegacyStrings {
  preset: Record<string, string>;
  customRange: string;
  customTitle: string;
  customHint: string;
  ok: string;
  cancel: string;
  refreshOff: string;
  refreshOptions: { value: string; label: string }[];
  fullscreen: string;
  exitFullscreen: string;
  timeLabel: string;
  refreshLabel: string;
  light: string;
  dark: string;
  chinese: string;
  english: string;
  all: string;
  noData: string;
  updating: string;
  unsupportedPanel: string;
  errorTitle: Record<EmbedErrorCode, string>;
}

const ZH: LegacyStrings = {
  preset: {
    '5m': '最近 5 分钟',
    '15m': '最近 15 分钟',
    '30m': '最近 30 分钟',
    '1h': '最近 1 小时',
    '6h': '最近 6 小时',
    '1d': '最近 1 天',
    '3d': '最近 3 天',
    '1w': '最近 1 周',
    '1month': '最近 1 月',
  },
  customRange: '自定义时段',
  customTitle: '自定义时间范围',
  customHint: '精确到秒，时区 UTC',
  ok: '确定',
  cancel: '取消',
  refreshOff: '关闭刷新',
  refreshOptions: [
    { value: 'off', label: '关闭刷新' },
    { value: '30s', label: '30 秒' },
    { value: '1m', label: '1 分钟' },
    { value: '5m', label: '5 分钟' },
  ],
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
  timeLabel: '时间',
  refreshLabel: '刷新',
  light: '浅色',
  dark: '深色',
  chinese: '中文',
  english: 'English',
  all: '全部',
  noData: '暂无数据',
  updating: '更新中…',
  unsupportedPanel: '暂不支持的 panel',
  errorTitle: {
    EMBED_MISSING_API_KEY: '缺少 API Key',
    EMBED_INVALID_API_KEY: 'API Key 无效或无查看权限',
    EMBED_DASHBOARD_NOT_FOUND: 'Dashboard 不存在或已被删除',
    EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz 后端不可达/超时',
    EMBED_READONLY: '嵌入页为只读，该操作不可用',
    EMBED_BLOCKED: '该接口未开放透传',
    EMBED_BAD_REQUEST: '请求参数有误',
  },
};

const EN: LegacyStrings = {
  preset: {
    '5m': 'Last 5 minutes',
    '15m': 'Last 15 minutes',
    '30m': 'Last 30 minutes',
    '1h': 'Last 1 hour',
    '6h': 'Last 6 hours',
    '1d': 'Last 1 day',
    '3d': 'Last 3 days',
    '1w': 'Last 1 week',
    '1month': 'Last 1 month',
  },
  customRange: 'Custom range',
  customTitle: 'Custom time range',
  customHint: 'Second precision, UTC',
  ok: 'OK',
  cancel: 'Cancel',
  refreshOff: 'Off',
  refreshOptions: [
    { value: 'off', label: 'Off' },
    { value: '30s', label: '30s' },
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
  ],
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  timeLabel: 'Time',
  refreshLabel: 'Refresh',
  light: 'Light',
  dark: 'Dark',
  chinese: '中文',
  english: 'English',
  all: 'All',
  noData: 'No data',
  updating: 'Updating…',
  unsupportedPanel: 'Unsupported panel',
  errorTitle: {
    EMBED_MISSING_API_KEY: 'Missing API Key',
    EMBED_INVALID_API_KEY: 'Invalid API key or insufficient permission',
    EMBED_DASHBOARD_NOT_FOUND: 'Dashboard not found or deleted',
    EMBED_UPSTREAM_UNAVAILABLE: 'SigNoz backend unreachable',
    EMBED_READONLY: 'Embed is read-only',
    EMBED_BLOCKED: 'Endpoint not proxied',
    EMBED_BAD_REQUEST: 'Bad request',
  },
};

export function legacyStrings(locale: EmbedLocale): LegacyStrings {
  return locale === 'en' ? EN : ZH;
}
