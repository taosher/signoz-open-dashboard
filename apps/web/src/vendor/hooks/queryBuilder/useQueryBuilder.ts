// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { useContext } from 'react';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

export function useQueryBuilder(): QueryBuilderContextType {
	return useContext(QueryBuilderContext);
}
