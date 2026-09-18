// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface License {
	key: string;
	ValidFrom: Date;
	ValidUntil: Date;
	planKey: string;
	status: string;
	isCurrent: boolean;
}
