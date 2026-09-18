// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ColumnsType } from 'antd/es/table';

export type UseDragColumns<T> = {
	draggedColumns: ColumnsType<T>;
	onDragColumns: (
		columns: ColumnsType<T>,
		fromIndex: number,
		toIndex: number,
	) => void;
	onColumnOrderChange: (newColumns: ColumnsType<T>) => void;
};
