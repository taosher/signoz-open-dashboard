// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { SelectProps } from 'antd';

export const popupContainer: SelectProps['getPopupContainer'] = (
	trigger,
): HTMLElement => trigger.parentNode;
