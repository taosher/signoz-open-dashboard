// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';

export interface Props {
	oldPassword: string;
	newPassword: string;
	userId: User['userId'];
}

export interface PayloadProps {
	status: string;
	data: string;
}
