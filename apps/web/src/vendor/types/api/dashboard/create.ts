// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Dashboard } from './getAll';

export type Props = {
	title: Dashboard['data']['title'];
	uploadedGrafana: boolean;
	version?: string;
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
