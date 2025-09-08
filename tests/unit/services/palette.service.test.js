import { generatePalette } from '../../../server/services/paletteService.js';
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

