// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import {
	ApDexPayloadAndSettingsProps,
	SetApDexPayloadProps,
} from 'types/api/metrics/getApDex';

export const setApDexSettings = async ({
	servicename,
	threshold,
	excludeStatusCode,
}: ApDexPayloadAndSettingsProps): Promise<SetApDexPayloadProps> =>
	axios.post('/settings/apdex', {
		servicename,
		threshold,
		excludeStatusCode,
	});
