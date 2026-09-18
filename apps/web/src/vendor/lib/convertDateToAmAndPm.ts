// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const convertDateToAmAndPm = (date: Date): string =>
	date.toLocaleString('en-US', {
		hour: '2-digit',
		minute: 'numeric',
		second: 'numeric',
		hour12: true,
	});

export default convertDateToAmAndPm;
