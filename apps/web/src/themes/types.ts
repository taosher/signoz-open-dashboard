/**
 * ThemeModule 契约（设计文档 §7.2）。新增主题唯一需要实现的接口；
 * core 只依赖该契约，不依赖任何主题的具体组件库。
 */
import type { ComponentType, ReactNode } from 'react';
import type { ControlVisibility, EmbedLocale, EmbedMode } from '@signoz-open-dashboard/shared';
import type { ErrorProps } from '../core/errors';
import type { DashboardVariable, EmbedWidget } from '../core/dashboard';
import type { ParsedV5 } from '../signoz/v5Response';

export interface ToolbarProps {
  title: string;
  showTitle: boolean;
  showToolbar: boolean;
  variables: Record<string, DashboardVariable>;
  variableValues: Record<string, unknown>;
  /** 解析后的候选项（QUERY 经接口取数）；缺省时主题按变量自带值推导。 */
  variableOptions?: Record<string, (string | number | boolean)[]>;
  onVariableChange: (name: string, value: unknown) => void;
  /** 深浅色（可选扩展，设计文档 §7.2；新主题可忽略）。 */
  mode?: EmbedMode;
  onModeChange?: (mode: EmbedMode) => void;
  /** 各控制项三态（设计文档 §4.1，缺省 show）。 */
  timeControl?: ControlVisibility;
  refreshControl?: ControlVisibility;
  modeControl?: ControlVisibility;
  fullscreenControl?: ControlVisibility;
  localeControl?: ControlVisibility;
  /** 语言与切换（legacy 提供工具条中英切换）。 */
  locale?: EmbedLocale;
  onLocaleChange?: (locale: EmbedLocale) => void;
  /** 全屏状态与切换（core 监听 fullscreenchange 同步）。 */
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  relativeTime: string | null;
  startTime: number | null;
  endTime: number | null;
  onTimeChange: (t: { relativeTime: string } | { startTime: number; endTime: number }) => void;
  refresh: string;
  onRefreshChange: (r: string) => void;
}

export interface WidgetProps {
  widget: EmbedWidget;
  loading: boolean;
  data: ParsedV5 | null;
  error: unknown;
  onRetry: () => void;
  startMs: number;
  endMs: number;
  /** 有旧数据时的后台取数中（可选扩展，主题可弱提示；缺省忽略）。 */
  refreshing?: boolean;
  /** 语言（空态/弱提示文案跟随；缺省 zh）。 */
  locale?: EmbedLocale;
}

export interface ThemeModule {
  name: string;
  TokensProvider: ComponentType<{ children: ReactNode }>;
  Toolbar: ComponentType<ToolbarProps>;
  WidgetCard: ComponentType<WidgetProps>;
  ErrorState: ComponentType<ErrorProps>;
}
