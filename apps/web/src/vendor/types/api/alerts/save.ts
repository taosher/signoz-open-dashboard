// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { AlertDef } from './def';

export type PayloadProps = {
	status: string;
	data: string;
};

export interface Props {
	id?: string;
	data: AlertDef;
}
