// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { useEffect, useRef } from 'react';

function usePreviousValue<T>(value: T): T {
	const ref = useRef<T>();

	useEffect(() => {
		ref.current = value;
	}, [value]);

	return ref.current as T;
}

export default usePreviousValue;
