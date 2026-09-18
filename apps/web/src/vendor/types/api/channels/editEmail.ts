// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { EmailChannel } from 'container/CreateAlertChannels/config';

export interface Props extends EmailChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
