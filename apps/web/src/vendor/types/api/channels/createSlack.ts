// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { SlackChannel } from 'container/CreateAlertChannels/config';

export type Props = SlackChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
