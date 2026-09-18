// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const get = (key: string): string | null => {
	try {
		return localStorage.getItem(key);
	} catch (e) {
		return '';
	}
};

export default get;
