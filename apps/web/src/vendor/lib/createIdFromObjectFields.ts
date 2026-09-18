// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { idDivider } from 'constants/queryBuilder';

export const createIdFromObjectFields = <T, K extends keyof T>(
	obj: T,
	orderedKeys: K[],
): string => orderedKeys.map((key) => obj[key]).join(idDivider);
