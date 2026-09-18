// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { getDeploymentsData } from 'api/customDomain/getDeploymentsData';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { DeploymentsDataProps } from 'types/api/customDomain/types';

export const useGetDeploymentsData = (
	isEnabled: boolean,
): UseQueryResult<AxiosResponse<DeploymentsDataProps>, AxiosError> =>
	useQuery<AxiosResponse<DeploymentsDataProps>, AxiosError>({
		queryKey: ['getDeploymentsData'],
		queryFn: () => getDeploymentsData(),
		enabled: isEnabled,
	});
