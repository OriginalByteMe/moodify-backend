import request from 'supertest';
import { jest } from '@jest/globals';
import { createApp } from '../../../server/server.js';
import { MOOD_TAXONOMY } from '../../../server/helpers/moodEngine.js';

describe('Analysis Routes', () => {
  const dummyDb = () => ({});
  const app = createApp(dummyDb);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /analysis/moods returns the mood taxonomy', async () => {
    const res = await request(app).get('/analysis/moods').expect(200);
    expect(Object.keys(res.body).sort()).toEqual(Object.keys(MOOD_TAXONOMY).sort());
    expect(res.body.euphoric).toMatchObject({ arousal: 'high', valence: 'high' });
  });

  test('POST /analysis/track without previewUrl returns 400', async () => {
    const res = await request(app).post('/analysis/track').send({}).expect(400);
    expect(res.body.error).toMatch(/previewUrl/);
  });

  test('POST /analysis/track returns 502 when the clip cannot be fetched', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    const res = await request(app)
      .post('/analysis/track')
      .send({ previewUrl: 'https://example.com/clip.mp3' })
      .expect(502);
    expect(res.body.error).toMatch(/Failed to fetch/);
  }, 15000);

  test('POST /analysis/track returns 415 when the payload is not decodable audio', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'audio/mpeg' },
      arrayBuffer: async () => new ArrayBuffer(64),
    });
    const res = await request(app)
      .post('/analysis/track')
      .send({ previewUrl: 'https://example.com/clip.mp3' })
      .expect(415);
    expect(res.body.error).toMatch(/decode|too short/i);
  }, 15000);
});
