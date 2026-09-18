// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { SettingPeriod } from 'container/GeneralSettings';

const converIntoHr = (value: number, peroid: SettingPeriod): number => {
	if (peroid === 'day') {
		return value * 24;
	}

	if (peroid === 'hr') {
		return value;
	}

	return value * 720;
};

export default converIntoHr;
