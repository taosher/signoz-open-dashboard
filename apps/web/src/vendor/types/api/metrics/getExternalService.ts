// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ExternalService {
	avgDuration: number;
	callRate: number;
	errorRate: number;
	externalHttpUrl: string;
	numCalls: number;
	numErrors: number;
	timestamp: number;
}

export type PayloadProps = ExternalService[];
