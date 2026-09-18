// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { createContext } from 'react';

import { IResourceAttributeProps } from './types';

export const ResourceContext = createContext<IResourceAttributeProps>(
	{} as IResourceAttributeProps,
);
