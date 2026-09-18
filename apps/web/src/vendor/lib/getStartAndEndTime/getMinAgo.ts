// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const getMinAgo = ({ minutes }: GetMinAgoProps): Date => {
	const currentDate = new Date();

	return new Date(currentDate.getTime() - minutes * 60000);
};

interface GetMinAgoProps {
	minutes: number;
}

export default getMinAgo;
