// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Button as ButtonComponent, Drawer } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 0.5rem;
`;

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const DrawerContainer = styled(Drawer)`
	.ant-drawer-header {
		padding: 0;
		border: none;
	}
`;
