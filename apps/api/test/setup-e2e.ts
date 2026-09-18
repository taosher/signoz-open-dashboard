// e2e 前置：ConfigModule 在 import 时即校验，先给占位值；用例内再覆盖为 mock 地址。
process.env.SIGNOZ_BASE_URL ??= 'http://127.0.0.1:1';
process.env.SIGNOZ_API_KEY ??= 'test-placeholder';
