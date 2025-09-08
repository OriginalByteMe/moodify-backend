import request from 'supertest';
import { createApp } from '../../../server/server.js';

describe('Health Route', () => {
  // Provide a minimal dummy DB since spotify service is attached at app init
  const dummyDb = () => ({});
  const app = createApp(dummyDb);

  test('GET /health responds with status message', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ message: 'Server is running' });
  });
});

