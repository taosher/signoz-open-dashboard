/** 看板变量 hook：解析一次（不随轮询 tick 重复取数），用户改选走上层覆盖。 */
import { useEffect, useState } from 'react';
import { useEmbedAuth } from './auth';
import type { DashboardVariable } from './dashboard';
import { resolveVariables, type VariableOptions, type VariableValues } from './variables';

export interface VariablesState {
  loading: boolean;
  values: VariableValues;
  options: VariableOptions;
}

export function useVariables(
  varsDef: Record<string, DashboardVariable> | undefined,
  urlVars: Record<string, string>,
  timeKey: string,
  startMs: number,
  endMs: number,
): VariablesState {
  const { apiKey } = useEmbedAuth();
  const [state, setState] = useState<VariablesState>({ loading: true, values: { ...urlVars }, options: {} });
  const urlVarsKey = JSON.stringify(urlVars);
  const varsKey = varsDef ? Object.keys(varsDef).join(',') : '';

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    resolveVariables(varsDef, { urlVars: JSON.parse(urlVarsKey) as Record<string, string>, startMs, endMs, apiKey, signal: ctrl.signal })
      .then(({ values, options }) => {
        if (ctrl.signal.aborted) return;
        setState({ loading: false, values, options });
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setState({ loading: false, values: JSON.parse(urlVarsKey) as Record<string, string>, options: {} });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varsKey, urlVarsKey, timeKey, apiKey]);

  return state;
}
