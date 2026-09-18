// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GlobalTime } from 'types/actions/globalTime';
import { Widgets } from 'types/api/dashboard/getAll';

const GetMaxMinTime = ({
	graphType,
	minTime,
	maxTime,
}: GetMaxMinProps): GlobalTime => {
	if (graphType === PANEL_TYPES.VALUE) {
		return {
			maxTime,
			minTime: maxTime,
		};
	}
	return {
		maxTime,
		minTime,
	};
};

interface GetMaxMinProps {
	graphType: Widgets['panelTypes'] | null;
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
}

export default GetMaxMinTime;
