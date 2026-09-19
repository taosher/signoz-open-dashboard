import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** M1 proxy matrix e2e: mock upstream, assert header injection + allowlist (design doc §6.2). */
describe('signoz proxy (e2e)', () => {
  let mock: http.Server;
  let mockBase = '';
  let seenUpstreamKey = '';
  let app: INestApplication;

  beforeAll(async () => {
    mock = http.createServer((req, res) => {
      seenUpstreamKey = (req.headers['signoz-api-key'] as string) ?? '';
      if (req.url === '/api/v1/version') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('v0.97.0');
        return;
      }
      if (
        req.method === 'GET' &&
        req.url === '/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942'
      ) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/v5/query_range') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', echo: body.length }));
        });
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'error' }));
    });
    await new Promise<void>((r) => mock.listen(0, r));
    const { port } = mock.address() as AddressInfo;
    mockBase = `http://127.0.0.1:${port}`;

    process.env.SIGNOZ_BASE_URL = mockBase;
    process.env.SIGNOZ_API_KEY = 'env-default-key';

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    // Minimal security setup matching main.ts
    const { EmbedExceptionFilter } = await import(
      '../src/observability/embed-exception.filter'
    );
    app.useGlobalFilters(new EmbedExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await new Promise<void>((r) => mock?.close(() => r()));
  });

  it('GET /healthz probes upstream version', async () => {
    const res = await request(app.getHttpServer()).get('/healthz').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.signozReachable).toBe(true);
  });

  it('dashboard GET forwards and injects SIGNOZ-API-KEY (header wins)', async () => {
    seenUpstreamKey = '';
    await request(app.getHttpServer())
      .get('/api/signoz/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942')
      .set('x-embed-api-key', 'header-key-123')
      .expect(200);
    expect(seenUpstreamKey).toBe('header-key-123');
  });

  it('falls back to env default key without header', async () => {
    seenUpstreamKey = '';
    await request(app.getHttpServer())
      .get('/api/signoz/api/v1/dashboards/019ca330-42b0-7a60-b882-1e607e047942')
      .expect(200);
    expect(seenUpstreamKey).toBe('env-default-key');
  });

  it('dashboard write endpoints return 403 READONLY', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/signoz/api/v1/dashboards/abc')
      .send({})
      .expect(403);
    expect(res.body.code).toBe('EMBED_READONLY');
  });

  it('non-allowlisted endpoints return 403 BLOCKED', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/signoz/api/v1/rules')
      .set('x-embed-api-key', 'k')
      .expect(403);
    expect(res.body.code).toBe('EMBED_BLOCKED');
  });

  it('query_range POST forwards through', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/signoz/api/v5/query_range')
      .set('x-embed-api-key', 'k')
      .send({ foo: 'bar' })
      .expect(200);
    expect(res.body.status).toBe('success');
    expect(seenUpstreamKey).toBe('k');
  });

  it('GET /metrics exposes metrics', async () => {
    await request(app.getHttpServer()).get('/metrics').expect(200);
  });
});
