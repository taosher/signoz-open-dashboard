// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import {
	UpdateViewPayloadProps,
	UpdateViewProps,
} from 'types/api/saveViews/types';

export const updateView = ({
	compositeQuery,
	viewName,
	extraData,
	sourcePage,
	viewKey,
}: UpdateViewProps): Promise<UpdateViewPayloadProps> =>
	axios.put(`/explorer/views/${viewKey}`, {
		name: viewName,
		compositeQuery,
		extraData,
		sourcePage,
	});
