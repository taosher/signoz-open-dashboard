// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface CheckoutSuccessPayloadProps {
	redirectURL: string;
}

export interface CheckoutRequestPayloadProps {
	url: string;
}

export interface PayloadProps {
	data: CheckoutSuccessPayloadProps;
	status: string;
}
