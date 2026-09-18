// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { TableProps } from 'antd';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

export const GRID_TABLE_CONFIG: Omit<
	TableProps<RowData>,
	'columns' | 'dataSource'
> = {
	size: 'small',
};
