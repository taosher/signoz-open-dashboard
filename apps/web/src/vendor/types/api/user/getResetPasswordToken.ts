// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { User } from 'types/reducer/app';

export interface Props {
	userId: User['userId'];
}

export interface GetResetPasswordToken {
	token: string;
	userId: string;
}

export interface PayloadProps {
	data: GetResetPasswordToken;
	status: string;
}
