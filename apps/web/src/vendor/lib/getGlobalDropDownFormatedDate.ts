// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
function getFormattedDate(date: Date): string {
	const month = `0${date.getMonth() + 1}`.slice(-2);
	const day = `0${date.getDate()}`.slice(-2);
	const year = date.getFullYear();
	const hour = `0${date.getHours()}`.slice(-2);
	const min = `0${date.getMinutes()}`.slice(-2);

	return `${year}/${month}/${day} ${hour}:${min}`;
}

export default getFormattedDate;
