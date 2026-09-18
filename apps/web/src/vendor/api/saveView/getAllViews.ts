// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import axios from 'api';
import { AxiosResponse } from 'axios';
import { AllViewsProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

export const getAllViews = (
	sourcepage: DataSource | 'meter',
): Promise<AxiosResponse<AllViewsProps>> =>
	axios.get(`/explorer/views?sourcePage=${sourcepage}`);
