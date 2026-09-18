// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ParsedUrl } from '../util';

export const parseIsSkippedSelection = (query: string): ParsedUrl<boolean> => {
	const url = new URLSearchParams(query);

	let current = false;

	const isSkippedSelected = url.get('isSelectedFilterSkipped');

	if (isSkippedSelected) {
		try {
			const parsedValue = JSON.parse(isSkippedSelected);

			if (typeof parsedValue === 'boolean') {
				current = parsedValue;
			}
		} catch (error) {
			current = false;
		}
	}

	if (isSkippedSelected) {
		return {
			currentValue: current,
			urlValue: current,
		};
	}

	return {
		currentValue: current,
		urlValue: current,
	};
};
