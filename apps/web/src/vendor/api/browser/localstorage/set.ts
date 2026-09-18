// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const set = (key: string, value: string): boolean => {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (e) {
		return false;
	}
};

export default set;
