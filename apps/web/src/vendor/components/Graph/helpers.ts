// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { themeColors } from 'constants/theme';

export const getAxisLabelColor = (currentTheme: string): string => {
	if (currentTheme === 'light') {
		return themeColors.black;
	}
	return themeColors.whiteCream;
};
