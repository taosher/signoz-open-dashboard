/**
 * Color mode (design doc §4.1 `mode`, orthogonal to themes; provided by core, rendered by each theme).
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { EmbedMode } from '@signoz-open-dashboard/shared';

const Ctx = createContext<EmbedMode>('light');

export function ColorModeProvider(props: { mode: EmbedMode; children: ReactNode }): JSX.Element {
  return <Ctx.Provider value={props.mode}>{props.children}</Ctx.Provider>;
}

export function useColorMode(): EmbedMode {
  return useContext(Ctx);
}

/** Chart foreground (echarts needs explicit colors, does not follow antd tokens). */
export function chartForeground(mode: EmbedMode): { text: string; grid: string; tooltipBg: string } {
  return mode === 'dark'
    ? { text: '#d5d5d5', grid: '#303030', tooltipBg: '#1f1f1f' }
    : { text: '#333333', grid: '#eeeeee', tooltipBg: '#ffffff' };
}
