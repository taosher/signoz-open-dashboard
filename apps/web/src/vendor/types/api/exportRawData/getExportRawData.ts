// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface ExportRawDataProps {
	source: string;
	format: string;
	start: number;
	end: number;
	columns: string[];
	filter: string;
	orderBy: string;
	limit: number;
}
