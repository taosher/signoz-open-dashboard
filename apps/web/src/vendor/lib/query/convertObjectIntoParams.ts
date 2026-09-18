// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const convertObjectIntoParams = (
	props: Record<string, unknown>,
	stringify = false,
): string =>
	Object.keys(props)
		.map(
			(e) =>
				`${e}=${
					stringify ? encodeURIComponent(JSON.stringify(props[e])) : props[e]
				}`,
		)
		.join('&');

export default convertObjectIntoParams;
