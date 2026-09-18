// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { SlackChannel } from 'container/CreateAlertChannels/config';

export interface Props extends SlackChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
