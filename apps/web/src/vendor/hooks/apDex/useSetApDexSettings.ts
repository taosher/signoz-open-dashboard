// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { setApDexSettings } from 'api/metrics/ApDex/apDexSettings';
import { useMutation, UseMutationResult } from 'react-query';
import {
	ApDexPayloadAndSettingsProps,
	SetApDexPayloadProps,
} from 'types/api/metrics/getApDex';

export const useSetApDexSettings = ({
	servicename,
	threshold,
	excludeStatusCode,
}: ApDexPayloadAndSettingsProps): UseMutationResult<
	SetApDexPayloadProps,
	Error,
	ApDexPayloadAndSettingsProps
> =>
	useMutation<SetApDexPayloadProps, Error, ApDexPayloadAndSettingsProps>({
		mutationKey: [servicename, threshold.toString(), excludeStatusCode],
		mutationFn: async () =>
			setApDexSettings({ servicename, threshold, excludeStatusCode }),
	});
