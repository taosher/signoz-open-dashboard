// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const convertIntoEpoc = (number: number): string =>
	number.toString().split('.').join('').toString();

export default convertIntoEpoc;
