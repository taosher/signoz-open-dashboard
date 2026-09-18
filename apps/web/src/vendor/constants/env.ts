// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export const ENVIRONMENT = {
	baseURL:
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
	wsURL: process?.env?.WEBSOCKET_API_ENDPOINT || '',
};
