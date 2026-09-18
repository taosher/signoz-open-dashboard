// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { AuthDomain } from './listDomain';

export type Props = {
	name: string;
	orgId: string;
};

export interface PayloadProps {
	data: AuthDomain;
	status: string;
}
