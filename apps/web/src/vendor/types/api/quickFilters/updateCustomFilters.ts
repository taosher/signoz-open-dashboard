// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { SignalType } from 'components/QuickFilters/types';

interface FilterType {
	key: string;
	datatype: string;
	type: string;
}

export interface UpdateCustomFiltersProps {
	data: {
		filters: FilterType[];
		signal: SignalType;
	};
}
