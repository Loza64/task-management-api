
import request from 'supertest';
import { createApp } from '../../../../app';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('task routes (validation layer)', () => {
  const app = createApp();

  it('GET /api-docs.json serves the OpenAPI spec', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.0');
    expect(Object.keys(res.body.paths)).toContain('/api/tasks');
  });

  it('POST /api/tasks rejects a body without title', async () => {
    const res = await request(app).post('/api/tasks').send({ description: 'sin título' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('title');
  });

  it('POST /api/tasks rejects a client-supplied status', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Válida', status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('status');
  });

  it('GET /api/tasks rejects an unknown status filter', async () => {
    const res = await request(app).get('/api/tasks?status=borrada');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('status');
  });

  it('GET /api/tasks rejects a pageSize above the limit', async () => {
    const res = await request(app).get('/api/tasks?pageSize=1000');

    expect(res.status).toBe(400);
  });

  it.each([
    ['get', '/api/tasks/abc'],
    ['patch', '/api/tasks/123'],
    ['patch', '/api/tasks/abc/complete'],
    ['patch', '/api/tasks/abc/status'],
    ['delete', '/api/tasks/abc'],
  ] as const)('%s %s rejects an invalid ObjectId', async (method, url) => {
    const res = await request(app)[method](url).send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('ObjectId');
  });

  it('PATCH /api/tasks/:id/status rejects an invalid status', async () => {
    const res = await request(app).patch(`/api/tasks/${VALID_ID}/status`).send({ status: 'done' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('status');
  });

  it('PATCH /api/tasks/:id rejects changing the status through the generic update', async () => {
    const res = await request(app).patch(`/api/tasks/${VALID_ID}`).send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('status');
  });
});
