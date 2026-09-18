// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface ConfigProps {
	enabled: boolean;
	frontendPositionId: string;
	components: Array<{
		href: string;
		darkIcon: string;
		lightIcon: string;
		position: 1;
		text: string;
	}>;
}
export interface PayloadProps {
	[key: string]: ConfigProps;
}
