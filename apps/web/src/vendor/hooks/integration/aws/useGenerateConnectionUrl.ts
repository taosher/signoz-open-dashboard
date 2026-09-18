// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { generateConnectionUrl } from 'api/integration/aws';
import { AxiosError } from 'axios';
import { useMutation, UseMutationResult } from 'react-query';
import {
	ConnectionUrlResponse,
	GenerateConnectionUrlPayload,
} from 'types/api/integrations/aws';

export function useGenerateConnectionUrl(): UseMutationResult<
	ConnectionUrlResponse,
	AxiosError,
	GenerateConnectionUrlPayload
> {
	return useMutation<
		ConnectionUrlResponse,
		AxiosError,
		GenerateConnectionUrlPayload
	>({
		mutationFn: generateConnectionUrl,
	});
}
