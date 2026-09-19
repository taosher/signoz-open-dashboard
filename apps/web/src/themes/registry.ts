/**
 * Theme registry (design doc §7.2): name → ThemeModule; unknown names fall back to shadcn.
 * To add a theme, only add `themes/<name>/` + one line here; never touch `core/`.
 */
import { legacyTheme } from './legacy';
import { shadcnTheme } from './shadcn';
import type { ThemeModule } from './types';

const REGISTRY: Record<string, ThemeModule> = {
  legacy: legacyTheme,
  shadcn: shadcnTheme,
};

export function resolveTheme(name: string): ThemeModule {
  return REGISTRY[name] ?? REGISTRY.shadcn;
}

export function registeredThemes(): string[] {
  return Object.keys(REGISTRY);
}
