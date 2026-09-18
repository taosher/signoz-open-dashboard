// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface UserResponse {
	createdAt: number;
	email: string;
	id: string;
	displayName: string;
	orgId: string;
	organization: string;
	role: ROLES;
}
export interface PayloadProps {
	data: UserResponse;
	status: string;
}
