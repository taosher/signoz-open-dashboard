// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export type DownloadOptions = {
	isDownloadEnabled: boolean;
	fileName: string;
};

export type DownloadProps = {
	data: Record<string, string>[];
	isLoading?: boolean;
	fileName: string;
};
