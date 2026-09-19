/** 默认主题装配（设计文档 §7.3：antd + echarts 系自研 UI）。 */
import { LegacyErrorState } from './LegacyErrorState';
import { LegacyTokensProvider } from './LegacyTokens';
import { LegacyToolbar } from './LegacyToolbar';
import { LegacyWidgetCard } from './LegacyWidgetCard';
import type { ThemeModule } from '../types';

export const legacyTheme: ThemeModule = {
  name: 'legacy',
  TokensProvider: LegacyTokensProvider,
  Toolbar: LegacyToolbar,
  WidgetCard: LegacyWidgetCard,
  ErrorState: LegacyErrorState,
};
