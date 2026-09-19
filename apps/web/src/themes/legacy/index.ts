/** Legacy theme assembly (design doc §7.3: antd + echarts-based custom UI). */
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
