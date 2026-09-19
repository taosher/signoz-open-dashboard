/**
 * 深浅色（设计文档 §4.1 `mode`，与主题正交，由 core 提供，各主题自行表达）。
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

/** 图表前景色（echarts 需显式指定，不跟随 antd token）。 */
export function chartForeground(mode: EmbedMode): { text: string; grid: string; tooltipBg: string } {
  return mode === 'dark'
    ? { text: '#d5d5d5', grid: '#303030', tooltipBg: '#1f1f1f' }
    : { text: '#333333', grid: '#eeeeee', tooltipBg: '#ffffff' };
}
