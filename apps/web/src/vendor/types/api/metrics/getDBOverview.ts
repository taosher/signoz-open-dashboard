// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Tags } from 'types/reducer/trace';

export interface Props {
	service: string;
	start: number;
	end: number;
	step: number;
	selectedTags: Tags[];
}

export interface DBOverView {
	avgDuration: number;
	callRate: number;
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
}

export type PayloadProps = DBOverView[];
