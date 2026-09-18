// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Dashboard, DashboardData } from './getAll';

export type Props = {
	id: Dashboard['id'];
	data: DashboardData;
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
