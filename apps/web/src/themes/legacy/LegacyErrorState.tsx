/** EMBED_ error-code empty state + Retry + requestId (styling by theme, title follows locale). */
import { Button, Result } from 'antd';
import { errorTitle, type ErrorProps } from '../../core/errors';

export function LegacyErrorState(props: ErrorProps): JSX.Element {
  const retryText = props.locale === 'en' ? 'Retry' : '重试';
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Result
        status={props.code === 'EMBED_DASHBOARD_NOT_FOUND' ? '404' : 'error'}
        title={errorTitle(props.code, props.locale)}
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
              {retryText}
            </Button>
          ) : null
        }
      />
    </div>
  );
}
