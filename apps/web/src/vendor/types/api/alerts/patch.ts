// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { GettableAlert } from './get';

export type PayloadProps = GettableAlert;

export interface PatchProps {
	disabled?: boolean;
}

export interface Props {
	id?: string;
	data: PatchProps;
}
