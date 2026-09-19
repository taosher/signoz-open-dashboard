/** Shadcn theme tokens: wrapped in `.schn` + `dark` class toggle (follows `?mode=`); page background/padding via CSS vars (24px breathing room, no gray backdrop). */
import type { ReactNode } from 'react';
import { useColorMode } from '../../core/colorMode';
import './shadcn.css';

export function ShadcnTokensProvider({ children }: { children: ReactNode }): JSX.Element {
  const mode = useColorMode();
  const dark = mode === 'dark';
  return (
    <div
      className={dark ? 'schn schn-dark' : 'schn'}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--embed-page-bg)',
        colorScheme: dark ? 'dark' : 'light',
        ['--embed-page-bg' as string]: dark ? '#09090b' : '#ffffff',
        ['--embed-page-pad' as string]: '24px',
        ['--embed-grid-gap' as string]: '24px',
      }}
    >
      {children}
    </div>
  );
}
