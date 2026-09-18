// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();

export const QBShortcuts = {
	StageAndRunQuery: 'enter+meta',
};

export const QBShortcutsName = {
	StageAndRunQuery: `${
		userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'
	}+enter`,
};

export const QBShortcutsDescription = {
	StageAndRunQuery: 'Stage and Run the current query',
};
