// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface PayloadProps {
	group_name: ROLES;
	user_id: string;
}
