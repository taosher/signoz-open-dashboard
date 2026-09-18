// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export const toCapitalize = (str: string): string => {
	if (!str) return '';

	return str[0].toUpperCase() + str.slice(1);
};
