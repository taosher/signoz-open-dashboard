// e2e setup: ConfigModule validates on import, so set placeholder values first; tests override them with the mock address.
process.env.SIGNOZ_BASE_URL ??= 'http://127.0.0.1:1';
process.env.SIGNOZ_API_KEY ??= 'test-placeholder';
