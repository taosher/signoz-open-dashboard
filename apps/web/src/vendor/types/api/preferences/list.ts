// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { OrgPreference, UserPreference } from './preference';

export interface PayloadProps {
	status: string;
	data: OrgPreference[] | UserPreference[];
}
