// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { GlobalTime } from 'types/actions/globalTime';
import { Tags } from 'types/reducer/trace';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
	tags: Tags[];
};

export type PayloadProps = number;
