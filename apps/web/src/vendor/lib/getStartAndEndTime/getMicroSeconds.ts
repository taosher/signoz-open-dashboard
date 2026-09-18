// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const getMicroSeconds = ({ time }: GetMicroSecondsProps): string =>
	(time / 1000).toString();

interface GetMicroSecondsProps {
	time: number;
}

export default getMicroSeconds;
