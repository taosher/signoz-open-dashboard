// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { IDashboardVariable } from '../getAll';

export type PayloadVariables = Record<
	string,
	IDashboardVariable['selectedValue']
>;

export type Props = {
	query: string;
	variables: PayloadVariables;
};

export type VariableResponseProps = {
	variableValues: string[] | number[];
};
