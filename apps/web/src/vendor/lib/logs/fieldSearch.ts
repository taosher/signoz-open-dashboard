// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export const fieldSearchFilter = (
	searchSpace = '',
	currentValue = '',
): boolean => {
	if (!currentValue || !searchSpace) {
		return true;
	}
	return searchSpace.toLowerCase().indexOf(currentValue.toLowerCase()) !== -1;
};
