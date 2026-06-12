import { generatePalette, fetchWithRetry } from '../../../server/services/paletteService.js';
import { jest } from '@jest/globals';

describe('paletteService.generatePalette', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  test('throws when url is missing', async () => {
    await expect(generatePalette(undefined)).rejects.toThrow('Missing image URL');
  });

  test('throws on non-ok fetch response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    await expect(generatePalette('https://example.com/image.jpg')).rejects.toThrow(
      'Failed to fetch image: 500 Internal Server Error'
    );
  });

  test('fetchWithRetry recovers from a transient network error', async () => {
    const okResponse = { ok: true, status: 200 };
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(okResponse);
    await expect(fetchWithRetry('https://example.com/image.jpg')).resolves.toBe(okResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('fetchWithRetry does not retry non-retryable 4xx responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(fetchWithRetry('https://example.com/missing.jpg')).rejects.toThrow(
      'Failed to fetch image: 404 Not Found'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('throws on unsupported content type', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/gif' },
      arrayBuffer: async () => new ArrayBuffer(8)
    });
    await expect(generatePalette('https://example.com/image.gif')).rejects.toThrow(
      'Unsupported image type: image/gif'
    );
  });
});

