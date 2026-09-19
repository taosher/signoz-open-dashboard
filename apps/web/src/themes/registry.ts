/**
 * 主题注册表（设计文档 §7.2）：name → ThemeModule；未知 name 回退 legacy。
 * 新增主题只加 `themes/<name>/` + 此处一行，不改 `core/`。
 */
import { legacyTheme } from './legacy';
import type { ThemeModule } from './types';

const REGISTRY: Record<string, ThemeModule> = {
  legacy: legacyTheme,
};

export function resolveTheme(name: string): ThemeModule {
  return REGISTRY[name] ?? REGISTRY.legacy;
}

export function registeredThemes(): string[] {
  return Object.keys(REGISTRY);
}
