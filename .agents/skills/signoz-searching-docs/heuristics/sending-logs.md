# Sending Logs to SigNoz

When a user asks about sending/collecting/forwarding logs to SigNoz, **do not jump to a specific guide**. First determine the right collection method by working through these questions.

## 1. What kind of logs?

- **Application logs** (from code you control) → compare SDK OTLP, HTTP API, or File + Collector based on needs below
- **Infrastructure logs** (K8s pods, Docker, syslogs) → usually File + OTel Collector
- **Cloud service logs** (CloudWatch, Azure, GCP) → OTel Collector Receivers or cloud-specific guides
- **Existing log pipeline** (FluentBit, Fluentd, Logstash, Vector) → Log Processors path

## 2. Is trace-log correlation needed?

- **Yes** → SDK OTLP export (Path 1), the only path with automatic `trace_id`/`span_id` injection
- **No** → choose based on simplicity, reliability, and where logs already live

## 3. Is reliability or external collection more important than in-app export?

- **Yes** → File + OTel Collector (Path 3) is usually the right default
- **No** → SDK OTLP or HTTP API may be simpler for application logs

## 4. What's the deployment environment?

- **Kubernetes** → check if k8s-infra agent is already installed; it collects pod logs automatically
- **Docker** → filelog receiver via OTel Collector
- **AWS** (ECS, Lambda, EC2) → cloud-specific guides; SigNoz Cloud users should check [One-Click AWS Integrations](https://signoz.io/docs/integrations/aws/one-click-aws-integrations/)
- **Azure / GCP** → platform-specific monitoring guides
- **PaaS** (Heroku, Vercel, Cloudflare) → platform-specific log forwarding

## Decision Table

| Scenario | Recommended Path | Docs |
|---|---|---|
| App logs + need trace correlation | SDK OTLP Export | [Path 1](https://signoz.io/docs/logs-management/send-logs/collection-methods/#path-1-sdk-otlp-export) |
| App logs + simple custom integration | HTTP API | [HTTP Logs API](https://signoz.io/docs/userguide/send-logs-http/) |
| App logs + need reliability, preprocessing, or external collection | File + OTel Collector | [Path 3](https://signoz.io/docs/logs-management/send-logs/collection-methods/#path-3-write-to-file--otel-collector) |
| K8s pod/container logs | k8s-infra agent or File + OTel Collector | [K8s Pod Logs](https://signoz.io/docs/userguide/collect_kubernetes_pod_logs/) |
| Docker or VM file/stdout logs | File + OTel Collector | [Path 3](https://signoz.io/docs/logs-management/send-logs/collection-methods/#path-3-write-to-file--otel-collector) |
| CloudWatch / syslog / journald | OTel Collector Receivers | [Path 4](https://signoz.io/docs/logs-management/send-logs/collection-methods/#path-4-otel-collector-receivers) |
| Already using FluentBit/Fluentd/Logstash/Vector | Log Processors | [Path 5](https://signoz.io/docs/logs-management/send-logs/collection-methods/#path-5-log-processors) |

## After Selecting a Path

If more than one path fits, recommend the simplest default for the user's environment and briefly explain the tradeoff.

Fetch the specific language or platform guide for detailed setup steps.

## Gotchas

- **Kubernetes duplicate logs**: If using both SDK OTLP (for app logs) and k8s-infra (for pod logs), [disable automatic log collection](https://signoz.io/docs/opentelemetry-collection-agents/k8s/k8s-infra/configure-k8s-infra/#disable-logs-collection) for SDK-instrumented pods to avoid duplicates.

## Reference

[Choosing a Collection Method](https://signoz.io/docs/logs-management/send-logs/collection-methods/)
