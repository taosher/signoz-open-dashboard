// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface Filter {
	key: string;
	dataType: string;
	type: string;
}

export interface Props {
	signal: string;
}

export type PayloadProps = {
	filters: Filter[];
	signal: string;
};
