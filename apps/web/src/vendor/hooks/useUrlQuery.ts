// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

function useUrlQuery(): URLSearchParams {
	const { search } = useLocation();

	return useMemo(() => new URLSearchParams(search), [search]);
}

export default useUrlQuery;
