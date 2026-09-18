// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export const getFormatedLegend = (value: string): string =>
	value.replace(/\{\s*\{\s*(.*?)\s*\}\s*\}/g, '{{$1}}');
