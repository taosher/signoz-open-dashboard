// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	other: {
		[k: string]: string[];
	};
	isFilterExclude: TraceReducer['isFilterExclude'];
	spanKind?: TraceReducer['spanKind'];
}

export interface PayloadProps {
	stringTagKeys: string[];
	numberTagKeys: string[];
	boolTagKeys: string[];
}
