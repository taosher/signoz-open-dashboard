// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import updateMetricMetadata, {
	UpdateMetricMetadataProps,
	UpdateMetricMetadataResponse,
} from 'api/metricsExplorer/updateMetricMetadata';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface UseUpdateMetricMetadataProps {
	metricName: string;
	payload: UpdateMetricMetadataProps;
}

export function useUpdateMetricMetadata(): UseMutationResult<
	SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse,
	Error,
	UseUpdateMetricMetadataProps
> {
	return useMutation<
		SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse,
		Error,
		UseUpdateMetricMetadataProps
	>({
		mutationFn: ({ metricName, payload }) =>
			updateMetricMetadata(metricName, payload),
	});
}
