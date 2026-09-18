// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface PendingInvite {
	createdAt: number;
	email: User['email'];
	name: User['displayName'];
	role: ROLES;
	id: string;
	token: string;
}

export type PayloadProps = {
	data: PendingInvite[];
	status: string;
};
