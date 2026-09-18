// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	GetIntegrationPayloadProps,
	GetIntegrationStatusProps,
} from 'types/api/integrations/types';

export const getIntegrationStatus = (
	props: GetIntegrationPayloadProps,
): Promise<AxiosResponse<GetIntegrationStatusProps>> =>
	axios.get(`/integrations/${props.integrationId}/connection_status`);
