/** Legacy theme tokens (antd ConfigProvider; dark switches to the dark algorithm; page background/padding via CSS vars). */
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';
import { useColorMode } from '../../core/colorMode';

export function LegacyTokensProvider({ children }: { children: ReactNode }): JSX.Element {
  const mode = useColorMode();
  const dark = mode === 'dark';
  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2278cf',
          borderRadius: 6,
          fontFamily: "Inter, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--embed-page-bg)',
          ['--embed-page-bg' as string]: dark ? '#141414' : '#f5f5f5',
          ['--embed-page-pad' as string]: '12px',
          ['--embed-grid-gap' as string]: '12px',
        }}
      >
        {children}
      </div>
    </ConfigProvider>
  );
}
