/** P8：@sentry/react 空桩。嵌入页不上报异常（原生 ErrorBoundary 改用本地 fallback）。 */
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{
  fallback: ReactNode;
  children: ReactNode;
}> {
  state = { bad: false };

  static getDerivedStateFromError(): { bad: boolean } {
    return { bad: true };
  }

  render(): ReactNode {
    if (this.state.bad) return this.props.fallback;
    return this.props.children;
  }
}

export const captureException = (..._args: unknown[]): void => undefined;
export const captureMessage = (..._args: unknown[]): void => undefined;
export const withProfiler = <T>(c: T): T => c;

export default { ErrorBoundary, captureException, captureMessage };
