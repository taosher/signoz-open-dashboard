// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const deleteView = (uuid: string): Promise<DeleteViewPayloadProps> =>
	axios.delete(`/explorer/views/${uuid}`);
