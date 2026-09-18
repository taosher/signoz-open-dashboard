// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { deleteView } from 'api/saveView/deleteView';
import { useMutation, UseMutationResult } from 'react-query';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const useDeleteView = (
	uuid: string,
): UseMutationResult<DeleteViewPayloadProps, Error, string> =>
	useMutation({
		mutationKey: [uuid],
		mutationFn: () => deleteView(uuid),
	});
