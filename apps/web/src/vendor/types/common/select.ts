// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ReactNode } from 'react';

export type SelectOption<Value, Label extends unknown = string> = {
	value: Value;
	label: Label;
};

export type ExtendedSelectOption = {
	disabled?: boolean;
	key: string;
	label: ReactNode;
	title?: string;
	value: string;
};
