// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ILog } from './log';

export type PayloadProps = ILog[];
export type Props = {
	q: string;
	limit: number;
	orderBy: string;
	order: string;
	idGt?: string;
	idLt?: string;
	timestampStart?: number;
	timestampEnd?: number;
};
