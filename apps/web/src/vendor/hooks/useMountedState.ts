// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { useCallback, useEffect, useRef } from 'react';

function useMountedState(): () => boolean {
	const mountedRef = useRef<boolean>(false);
	const get = useCallback(() => mountedRef.current, []);

	useEffect(() => {
		mountedRef.current = true;

		return (): void => {
			mountedRef.current = false;
		};
	}, []);

	return get;
}

export default useMountedState;
