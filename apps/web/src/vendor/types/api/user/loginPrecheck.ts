// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface PayloadProps {
	data: Signup;
	status: string;
}

export interface Signup {
	sso: boolean;
	ssoUrl?: string;
	canSelfRegister?: boolean;
	isUser: boolean;
}

export interface Props {
	email: string;
	path?: string;
}
