/** legacy 主题 token（antd ConfigProvider；dark 时切暗算法）。 */
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';
import { useColorMode } from '../../core/colorMode';

export function LegacyTokensProvider({ children }: { children: ReactNode }): JSX.Element {
  const mode = useColorMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2278cf',
          borderRadius: 6,
          fontFamily: "Inter, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
