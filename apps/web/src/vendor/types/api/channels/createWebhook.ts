// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { WebhookChannel } from 'container/CreateAlertChannels/config';

export type Props = WebhookChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
