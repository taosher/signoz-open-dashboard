// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
const remove = (key: string): boolean => {
	try {
		window.localStorage.removeItem(key);
		return true;
	} catch (e) {
		return false;
	}
};

export default remove;
