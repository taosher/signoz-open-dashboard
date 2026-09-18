// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ExternalError {
	avgDuration: number;
	errorRate: number;
	externalHttpUrl: string;
	numErrors: number;
	timestamp: number;
}

export type PayloadProps = ExternalError[];
