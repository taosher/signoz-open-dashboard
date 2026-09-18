// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import { AxiosResponse } from 'axios';
import { AllIntegrationsProps } from 'types/api/integrations/types';

export const getAllIntegrations = (): Promise<
	AxiosResponse<AllIntegrationsProps>
> => axios.get(`/integrations`);
