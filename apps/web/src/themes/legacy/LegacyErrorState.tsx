/** EMBED_ 错误码空态 + Retry + requestId（样式由主题表达）。 */
import { Button, Result } from 'antd';
import { errorTitle, type ErrorProps } from '../../core/errors';

export function LegacyErrorState(props: ErrorProps): JSX.Element {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Result
        status={props.code === 'EMBED_DASHBOARD_NOT_FOUND' ? '404' : 'error'}
        title={errorTitle(props.code)}
        subTitle={
          <span>
            {props.message}
            {props.requestId ? <span style={{ display: 'block', marginTop: 8, color: '#999' }}>requestId: {props.requestId}</span> : null}
            <span style={{ display: 'block', marginTop: 4, color: '#999' }}>{props.code}</span>
          </span>
        }
        extra={
          props.retry && props.onRetry ? (
            <Button type="primary" onClick={props.onRetry}>
              重试
            </Button>
          ) : null
        }
      />
    </div>
  );
}
