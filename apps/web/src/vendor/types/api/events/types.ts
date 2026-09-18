// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface EventSuccessPayloadProps {
	status: string;
	data: string;
}

export interface EventRequestPayloadProps {
	eventName: string;
	attributes: Record<string, unknown>;
}
