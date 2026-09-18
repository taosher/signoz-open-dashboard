// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ROLES } from 'types/roles';

export interface Props {
	group_name: ROLES;
	userId: string;
}

export interface PayloadProps {
	data: string;
}
