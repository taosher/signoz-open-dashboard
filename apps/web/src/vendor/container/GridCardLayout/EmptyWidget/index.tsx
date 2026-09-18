// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Typography } from 'antd';

import { Container } from './styles';

function EmptyWidget(): JSX.Element {
	return (
		<Container>
			<Typography.Paragraph>
				Click one of the widget types above (Time Series / Value) to add here
			</Typography.Paragraph>
		</Container>
	);
}

export default EmptyWidget;
