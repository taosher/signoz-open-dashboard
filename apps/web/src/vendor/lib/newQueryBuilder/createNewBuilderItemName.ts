// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
type CreateNewBuilderItemNameParams = {
	existNames: string[];
	sourceNames: string[];
};

export const createNewBuilderItemName = ({
	existNames,
	sourceNames,
}: CreateNewBuilderItemNameParams): string => {
	for (let i = 0; i < sourceNames.length; i += 1) {
		if (!existNames.includes(sourceNames[i])) {
			return sourceNames[i];
		}
	}

	return '';
};
