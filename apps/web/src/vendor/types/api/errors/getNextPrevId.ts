// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export type Props = {
	errorID: string;
	timestamp: string;
	groupID: string;
};

export type PayloadProps = {
	prevErrorID: string;
	nextErrorID: string;
	groupID: string;
	nextTimestamp: string;
	prevTimestamp: string;
};
