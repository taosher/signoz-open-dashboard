// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { AlertDef } from './def';

export interface Props {
	id: AlertDef['id'];
}

export interface PayloadProps {
	status: string;
	data: string;
}
