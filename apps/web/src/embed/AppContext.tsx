/* eslint-disable @typescript-eslint/no-explicit-any */
// EMBED-P3：providers/App/App 的最小桩（见 third_party/PATCHES.md）。
// 导出与原生相同名字（AppContext/AppProvider/useAppContext），上下文类型沿用
// 原生 IAppContext（TS 保证形状一致）。嵌入为只读匿名查看：isLoggedIn 恒 true，
// 角色 VIEWER（隐藏编辑类入口），其余需要登录态的远端数据一律置空/关闭。
import { createContext, PropsWithChildren, useContext } from 'react';
import { IAppContext, IUser } from '../vendor/providers/App/types';

export const AppContext = createContext<IAppContext | undefined>(undefined);

const noop = (): void => undefined;

const stubUser: IUser = {
  accessJwt: '',
  refreshJwt: '',
  id: 'embed-viewer',
  email: '',
  displayName: 'Embed Viewer',
  createdAt: 0,
  organization: '',
  orgId: '',
  role: 'VIEWER',
};

const stubValue: IAppContext = {
  user: stubUser,
  activeLicense: null,
  trialInfo: null,
  featureFlags: [],
  orgPreferences: [],
  userPreferences: [],
  isLoggedIn: true,
  org: [],
  isFetchingUser: false,
  isFetchingActiveLicense: false,
  isFetchingFeatureFlags: false,
  isFetchingOrgPreferences: false,
  userFetchError: null,
  activeLicenseFetchError: null,
  featureFlagsFetchError: null,
  orgPreferencesFetchError: null,
  changelog: null,
  showChangelogModal: false,
  activeLicenseRefetch: noop,
  updateUser: noop as any,
  updateOrgPreferences: noop as any,
  updateUserPreferenceInContext: noop as any,
  updateOrg: noop as any,
  updateChangelog: noop as any,
  toggleChangelogModal: noop,
  versionData: null,
  hasEditPermission: false,
};

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
  return <AppContext.Provider value={stubValue}>{children}</AppContext.Provider>;
}

export const useAppContext = (): IAppContext => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
