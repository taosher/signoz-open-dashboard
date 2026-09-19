/**
 * ThemeModule contract (design doc §7.2). The only interface a new theme must implement;
 * core depends solely on this contract, never on any theme's concrete component library.
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
  /** Resolved options (QUERY fetched via API); when absent the theme derives from the variable's own values. */
  variableOptions?: Record<string, (string | number | boolean)[]>;
  onVariableChange: (name: string, value: unknown) => void;
  /** Color mode (optional extension, design doc §7.2; new themes may ignore). */
  mode?: EmbedMode;
  onModeChange?: (mode: EmbedMode) => void;
  /** Tri-state for each control (design doc §4.1, default show). */
  timeControl?: ControlVisibility;
  refreshControl?: ControlVisibility;
  modeControl?: ControlVisibility;
  fullscreenControl?: ControlVisibility;
  localeControl?: ControlVisibility;
  /** Locale and switching (each theme provides its own locale switch). */
  locale?: EmbedLocale;
  onLocaleChange?: (locale: EmbedLocale) => void;
  /** Fullscreen state and toggle (core syncs on fullscreenchange). */
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
  /** Background refetch with stale data (optional extension, theme may show a subtle hint; ignored by default). */
  refreshing?: boolean;
  /** Locale (empty-state/subtle-hint copy follows it; defaults to zh). */
  locale?: EmbedLocale;
}

export interface ThemeModule {
  name: string;
  TokensProvider: ComponentType<{ children: ReactNode }>;
  Toolbar: ComponentType<ToolbarProps>;
  WidgetCard: ComponentType<WidgetProps>;
  ErrorState: ComponentType<ErrorProps>;
}
