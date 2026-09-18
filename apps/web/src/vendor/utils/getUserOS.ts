// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export enum UserOperatingSystem {
	WINDOWS = 'Windows',
	MACOS = 'Mac OS',
}

export function getUserOperatingSystem(): UserOperatingSystem {
	// https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
	if (window.navigator.userAgent.indexOf(UserOperatingSystem.WINDOWS) !== -1) {
		return UserOperatingSystem.WINDOWS;
	}

	// default return is MacOS
	return UserOperatingSystem.MACOS;
}
