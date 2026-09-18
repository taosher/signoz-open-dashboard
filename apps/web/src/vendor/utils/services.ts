// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ServicesList } from 'types/api/metrics/getService';

export const getTotalRPS = (services: ServicesList[]): number =>
	services.reduce((accumulator, service) => accumulator + service.callRate, 0);
