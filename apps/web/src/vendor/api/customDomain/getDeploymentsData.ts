// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { GatewayApiV2Instance as axios } from 'api';
import { AxiosResponse } from 'axios';
import { DeploymentsDataProps } from 'types/api/customDomain/types';

export const getDeploymentsData = (): Promise<
	AxiosResponse<DeploymentsDataProps>
> => axios.get(`/deployments/me`);
