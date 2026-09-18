// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { MsTeamsChannel } from 'container/CreateAlertChannels/config';

export interface Props extends MsTeamsChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
