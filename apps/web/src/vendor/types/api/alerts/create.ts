// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { AlertDef } from 'types/api/alerts/def';

export interface Props {
	data: AlertDef;
}

export interface PayloadProps {
	status: string;
	data: string;
}
