// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { DataSource } from 'types/common/queryBuilder';

import { BaseAutocompleteData } from './queryAutocompleteResponse';

export interface IGetAttributeKeysPayload {
	aggregateOperator: string;
	dataSource: DataSource;
	searchText: string;
	aggregateAttribute: string;
	tagType?: BaseAutocompleteData['type'];
}
