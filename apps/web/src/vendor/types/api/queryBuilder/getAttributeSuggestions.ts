// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { DataSource } from 'types/common/queryBuilder';

import { BaseAutocompleteData } from './queryAutocompleteResponse';
import { TagFilter } from './queryBuilderData';

export interface IGetAttributeSuggestionsPayload {
	dataSource: DataSource;
	searchText: string;
	filters: TagFilter;
}

export interface IGetAttributeSuggestionsSuccessResponse {
	attributes: BaseAutocompleteData[];
	example_queries: TagFilter[];
}
