/** Shadcn theme tokens: wrapped in `.schn` + `dark` class toggle (follows `?mode=`); page background/padding via CSS vars (24px breathing room, no gray backdrop). */
import type { ReactNode } from 'react';
import { useColorMode } from '../../core/colorMode';
import './shadcn.css';

export function ShadcnTokensProvider({ children }: { children: ReactNode }): JSX.Element {
  const mode = useColorMode();
  const dark = mode === 'dark';
  return (
    <div
      // Full-page children (e.g. the error state) size themselves with flex, so the page shell
      // must be a flex column that can actually take the viewport height.
      className={dark ? 'schn schn-dark flex min-h-screen flex-col' : 'schn flex min-h-screen flex-col'}
      style={{
        backgroundColor: 'var(--embed-page-bg)',
        colorScheme: dark ? 'dark' : 'light',
        ['--embed-page-bg' as string]: dark ? '#09090b' : '#ffffff',
        ['--embed-page-pad' as string]: '12px',
        ['--embed-grid-gap' as string]: '12px',
      }}
    >
      {children}
    </div>
  );
}
