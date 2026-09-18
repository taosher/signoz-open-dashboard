// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { getAllIntegrations } from 'api/Integrations/getAllIntegrations';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { AllIntegrationsProps } from 'types/api/integrations/types';

export const useGetAllIntegrations = (): UseQueryResult<
	AxiosResponse<AllIntegrationsProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<AllIntegrationsProps>, AxiosError>({
		queryKey: ['Integrations'],
		queryFn: () => getAllIntegrations(),
	});
