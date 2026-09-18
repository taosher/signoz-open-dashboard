// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Channels } from './getAll';

export interface Props {
	id: Channels['id'];
}

export type PayloadProps = {
	data: Channels;
	status: string;
};
