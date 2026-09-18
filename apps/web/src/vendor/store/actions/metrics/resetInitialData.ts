// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';

export const ResetInitialData = (): ((
	dispatch: Dispatch<AppActions>,
	getState: () => AppState,
) => void) => (dispatch): void => {
	dispatch({
		type: 'RESET_INITIAL_APPLICATION_DATA',
	});
};
