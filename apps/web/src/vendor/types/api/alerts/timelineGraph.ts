// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { AlertDef } from './def';

export interface GetTimelineGraphRequestProps {
	id: AlertDef['id'];
	start: number;
	end: number;
}
