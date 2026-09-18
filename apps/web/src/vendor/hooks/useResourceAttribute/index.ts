// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import ResourceProvider from './ResourceProvider';
import useResourceAttribute from './useResourceAttribute';
import { convertMetricKeyToTrace, isResourceEmpty } from './utils';

export default useResourceAttribute;

export { convertMetricKeyToTrace, isResourceEmpty, ResourceProvider };
