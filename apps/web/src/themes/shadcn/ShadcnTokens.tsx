/** shadcn 主题 token：`.schn` 包裹 + `dark` class 切换（跟随 `?mode=`）。 */
import type { ReactNode } from 'react';
import { useColorMode } from '../../core/colorMode';
import './shadcn.css';

export function ShadcnTokensProvider({ children }: { children: ReactNode }): JSX.Element {
  const mode = useColorMode();
  return <div className={mode === 'dark' ? 'schn schn-dark' : 'schn'}>{children}</div>;
}
