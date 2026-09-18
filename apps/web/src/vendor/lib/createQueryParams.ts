// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const createQueryParams = (params: {
	[x: string]: string | number | undefined;
}): string =>
	Object.keys(params)
		.map(
			(k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`,
		)
		.join('&');

export default createQueryParams;
