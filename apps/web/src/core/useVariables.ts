/**
 * Dashboard variables (M7: TanStack Query). Candidates change slowly: `staleTime` 5 minutes,
 * resolved once (not on polling ticks); user selections override from above.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
  const { dashboardId, apiKey } = useEmbedAuth();
  const urlVarsKey = JSON.stringify(urlVars);
  const varsKey = varsDef ? Object.keys(varsDef).join(',') : '';

  const query = useQuery({
    queryKey: ['embed', 'vars', dashboardId, varsKey, urlVarsKey, timeKey, apiKey ? 'key' : 'nokey'],
    queryFn: async ({ signal }): Promise<{ values: VariableValues; options: VariableOptions }> =>
      resolveVariables(varsDef, {
        urlVars: JSON.parse(urlVarsKey) as Record<string, string>,
        startMs,
        endMs,
        apiKey,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  return {
    loading: query.isLoading && !query.data,
    values: query.data?.values ?? (JSON.parse(urlVarsKey) as Record<string, string>),
    options: query.data?.options ?? {},
  };
}
