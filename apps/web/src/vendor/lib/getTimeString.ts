// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const getTimeString = (time: string): string => {
	const timeString = time.split('.').join('').slice(0, 13);

	if (timeString.length < 13) {
		const lengthMissing = timeString.length - 13;

		const numberZero = new Array(Math.abs(lengthMissing)).fill(0).join('');

		return timeString + numberZero;
	}

	return timeString;
};

export default getTimeString;
