// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface ApDexPayloadAndSettingsProps {
	servicename: string;
	threshold: number;
	excludeStatusCode: string;
}

export interface SetApDexPayloadProps {
	data: string;
}

export interface MetricMetaProps {
	delta: boolean;
	le: number[] | null;
}

export interface PayloadProps {
	data: ApDexPayloadAndSettingsProps[];
	status: string;
}
