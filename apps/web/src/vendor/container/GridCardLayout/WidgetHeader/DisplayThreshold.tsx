// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { InfoCircleOutlined } from '@ant-design/icons';

import {
	DisplayThresholdContainer,
	TypographHeading,
	Typography,
} from './styles';
import { DisplayThresholdProps } from './types';

function DisplayThreshold({ threshold }: DisplayThresholdProps): JSX.Element {
	return (
		<DisplayThresholdContainer>
			<TypographHeading>Threshold </TypographHeading>
			<Typography>{threshold || <InfoCircleOutlined />}</Typography>
		</DisplayThresholdContainer>
	);
}

export default DisplayThreshold;
