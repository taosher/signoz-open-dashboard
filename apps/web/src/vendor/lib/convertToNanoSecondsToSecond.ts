// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const convertToNanoSecondsToSecond = (number: number): string =>
	parseFloat((number / 1000000).toString()).toFixed(2);

export default convertToNanoSecondsToSecond;
