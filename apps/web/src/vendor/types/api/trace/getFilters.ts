// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: string;
	end: string;
	getFilters: string[];
	other: {
		[k: string]: string[];
	};
	isFilterExclude: TraceReducer['isFilterExclude'];
	spanKind?: TraceReducer['spanKind'];
}

export interface PayloadProps {
	[key: string]: Record<string, string>;
}
