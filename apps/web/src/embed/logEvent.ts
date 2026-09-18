// EMBED-P2：logEvent 空实现（嵌入页不上报产品遥测，见 third_party/PATCHES.md）。
// 签名与原生 api/common/logEvent 一致。
const logEvent = async (
  _eventName: string,
  _attributes: Record<string, unknown>,
  _eventType?: 'track' | 'group' | 'identify',
  _rateLimited?: boolean,
): Promise<unknown> => ({
  statusCode: 200,
  error: null,
  message: 'noop',
  payload: null,
});

export default logEvent;
