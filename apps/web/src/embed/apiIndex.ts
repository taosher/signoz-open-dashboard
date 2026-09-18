/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
// EMBED-P1：基于 SigNoz 0.97.0 api/index.ts 的嵌入改写（见 third_party/PATCHES.md）。
// 差异：① baseURL 全部改为同源 /api/signoz 前缀；② 请求头改写 x-embed-api-key
// （内存 key，无则不带，服务端回退 env 默认值），删除 Authorization: Bearer；
// ③ 删除 JWT 刷新 + Logout 分支（嵌入无登录态，401 直接上抛给调用方空态处理）。
import axios, {
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { Events } from 'constants/events';
import { eventEmitter } from 'utils/getEventEmitter';
import { getEmbedApiKey } from '../embed/keyStore';

import apiV1, {
  apiAlertManager,
  apiV2,
  apiV3,
  apiV4,
  apiV5,
  gatewayApiV1,
  gatewayApiV2,
} from '../vendor/api/apiV1';

const RESPONSE_TIMEOUT_THRESHOLD = 5000; // 5 seconds

const interceptorsResponse = (
  value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => {
  if ((value.config as any)?.metadata) {
    const duration =
      new Date().getTime() - (value.config as any).metadata.startTime;

    if (duration > RESPONSE_TIMEOUT_THRESHOLD && value.config.url !== '/event') {
      eventEmitter.emit(Events.SLOW_API_WARNING, true, {
        duration,
        url: value.config.url,
        threshold: RESPONSE_TIMEOUT_THRESHOLD,
      });

      console.warn(
        `[API Warning] Request to ${value.config.url} took ${duration}ms`,
      );
    }
  }

  return Promise.resolve(value);
};

const interceptorsRequestResponse = (
  value: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  // Attach metadata safely (not sent with the request)
  Object.defineProperty(value, 'metadata', {
    value: { startTime: new Date().getTime() },
    enumerable: false, // Prevents it from being included in the request
  });

  // EMBED-P1：内存 key 经 x-embed-api-key 透传；无 key 时不带头，服务端回退 env 默认值
  const key = getEmbedApiKey();

  if (value && value.headers) {
    delete value.headers.Authorization;
    if (key) {
      (value.headers as any)['x-embed-api-key'] = key;
    }
  }

  return value;
};

// EMBED-P1：无刷新/Logout，直接 reject，由调用方按 EMBED_ 错误码展示空态
const interceptorRejected = async (
  value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => Promise.reject(value);

const interceptorRejectedBase = async (
  value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => Promise.reject(value);

const instance = axios.create({
  baseURL: `/api/signoz${apiV1}`,
});

instance.interceptors.request.use(interceptorsRequestResponse);
instance.interceptors.response.use(interceptorsResponse, interceptorRejected);

export const AxiosAlertManagerInstance = axios.create({
  baseURL: `/api/signoz${apiAlertManager}`,
});

export const ApiV2Instance = axios.create({
  baseURL: `/api/signoz${apiV2}`,
});
ApiV2Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);
ApiV2Instance.interceptors.request.use(interceptorsRequestResponse);

// axios V3
export const ApiV3Instance = axios.create({
  baseURL: `/api/signoz${apiV3}`,
});

ApiV3Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);
ApiV3Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios V4
export const ApiV4Instance = axios.create({
  baseURL: `/api/signoz${apiV4}`,
});

ApiV4Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);
ApiV4Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios V5
export const ApiV5Instance = axios.create({
  baseURL: `/api/signoz${apiV5}`,
});

ApiV5Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);
ApiV5Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios Base
export const ApiBaseInstance = axios.create({
  baseURL: `/api/signoz${apiV1}`,
});

ApiBaseInstance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejectedBase,
);
ApiBaseInstance.interceptors.request.use(interceptorsRequestResponse);
//

// gateway Api V1
export const GatewayApiV1Instance = axios.create({
  baseURL: `/api/signoz${gatewayApiV1}`,
});

GatewayApiV1Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);

GatewayApiV1Instance.interceptors.request.use(interceptorsRequestResponse);
//

// gateway Api V2
export const GatewayApiV2Instance = axios.create({
  baseURL: `/api/signoz${gatewayApiV2}`,
});

GatewayApiV2Instance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);

GatewayApiV2Instance.interceptors.request.use(interceptorsRequestResponse);
//

AxiosAlertManagerInstance.interceptors.response.use(
  interceptorsResponse,
  interceptorRejected,
);
AxiosAlertManagerInstance.interceptors.request.use(interceptorsRequestResponse);

export { apiV1 };
export default instance;
