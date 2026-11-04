/** Shadcn default theme assembly (tailwind + Recharts-based custom UI). */
import type { ThemeModule } from '../types';
import { ShadcnErrorState } from './ShadcnErrorState';
import { ShadcnTokensProvider } from './ShadcnTokens';
import { ShadcnToolbar } from './ShadcnToolbar';
import { ShadcnWidgetCard } from './ShadcnWidgetCard';
import { DrilldownMenu } from './ShadcnDrilldownMenu';

export const shadcnTheme: ThemeModule = {
  name: 'shadcn',
  TokensProvider: ShadcnTokensProvider,
  Toolbar: ShadcnToolbar,
  WidgetCard: ShadcnWidgetCard,
  DrilldownMenu,
  ErrorState: ShadcnErrorState,
};
