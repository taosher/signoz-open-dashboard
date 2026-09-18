// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { FeatureKeys } from 'constants/features';

export interface FeatureFlagProps {
	name: FeatureKeys;
	active: boolean;
	usage: number;
	usage_limit: number;
	route: string;
}

export interface PayloadProps {
	data: FeatureFlagProps[];
	status: string;
}
