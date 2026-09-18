// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { DataSource } from 'types/common/queryBuilder';

export interface IGetAggregateAttributePayload {
	aggregateOperator: string;
	dataSource: DataSource;
	searchText: string;
	source?: 'meter' | '';
}
