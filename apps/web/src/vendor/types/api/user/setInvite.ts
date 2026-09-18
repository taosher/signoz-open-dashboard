// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	name: User['displayName'];
	email: User['email'];
	role: ROLES;
	frontendBaseUrl: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
