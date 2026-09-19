import { decideProxy } from './proxy.allowlist';

describe('proxy.allowlist (design doc §6.2)', () => {
  it('allows GET single dashboard', () => {
    expect(
      decideProxy('GET', '/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942'),
    ).toEqual({ allowed: true });
  });

  it('denies dashboard write endpoints and lock', () => {
    expect(decideProxy('PUT', '/api/v1/dashboards/abc')).toEqual({
      allowed: false,
      code: 'EMBED_READONLY',
    });
    expect(decideProxy('DELETE', '/api/v1/dashboards/abc')).toEqual({
      allowed: false,
      code: 'EMBED_READONLY',
    });
    expect(decideProxy('PUT', '/api/v1/dashboards/abc/lock')).toEqual({
      allowed: false,
      code: 'EMBED_READONLY',
    });
    expect(decideProxy('GET', '/api/v1/dashboards')).toEqual({
      allowed: false,
      code: 'EMBED_BLOCKED',
    });
  });

  it('allows query POST endpoints', () => {
    for (const p of [
      '/api/v3/query_range',
      '/api/v3/query_range/format',
      '/api/v4/query_range',
      '/api/v5/query_range',
      '/api/v5/substitute_vars',
      '/api/v2/variables/query',
    ]) {
      expect(decideProxy('POST', p)).toEqual({ allowed: true });
    }
  });

  it('allows version/features/fields-values GET, denies everything else with 403', () => {
    expect(decideProxy('GET', '/api/v1/version')).toEqual({ allowed: true });
    expect(decideProxy('GET', '/api/v1/features')).toEqual({ allowed: true });
    expect(
      decideProxy('GET', '/api/v1/fields/values?signal=metrics&name=service.name'),
    ).toEqual({ allowed: true });
    expect(decideProxy('GET', '/api/v1/rules')).toEqual({
      allowed: false,
      code: 'EMBED_BLOCKED',
    });
    expect(decideProxy('GET', '/api/v1/alerts')).toEqual({
      allowed: false,
      code: 'EMBED_BLOCKED',
    });
    expect(decideProxy('GET', '/api/v1/dashboards/abc/unknown')).toEqual({
      allowed: false,
      code: 'EMBED_BLOCKED',
    });
  });
});
