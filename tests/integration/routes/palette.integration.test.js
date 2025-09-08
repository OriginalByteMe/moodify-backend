import request from 'supertest';
import { createApp } from '../../../server/server.js';

describe('Palette Routes', () => {
  const dummyDb = () => ({});
  const app = createApp(dummyDb);

  test('POST /palette/track without image_url returns 400', async () => {
    const res = await request(app)
      .post('/palette/track')
      .expect(400);
    expect(res.text).toContain('Missing image_url parameter');
  });

  test('POST /palette/album without albumCover returns 400', async () => {
    const res = await request(app)
      .post('/palette/album')
      .send({})
      .expect(400);
    expect(res.body).toEqual({ error: 'Album cover URL is required.' });
  });
});

