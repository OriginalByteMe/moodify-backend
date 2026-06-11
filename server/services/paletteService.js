import sharp from 'sharp';
import PixelPeeper from "../helpers/PixelPeeper.js";

const FETCH_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
// Album art is decoded at a bounded size: plenty of pixels for a palette,
// and keeps memory/CPU flat regardless of source image dimensions.
const DECODE_MAX_DIMENSION = 384;

/**
 * Fetch a URL with a timeout, retrying on network errors and 5xx/429 responses.
 * @param {string} url - The URL to fetch
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, retries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) return response;
      lastError = new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      // Only retry statuses that can plausibly succeed on a second attempt
      if (response.status !== 429 && response.status < 500) throw lastError;
    } catch (err) {
      if (err === lastError) throw err;
      lastError = err.name === 'AbortError'
        ? new Error(`Failed to fetch image: request timed out after ${FETCH_TIMEOUT_MS}ms`)
        : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}

/**
 * Generate a color palette from an image URL.
 * Decoding goes through sharp, so JPEG, PNG, WebP, GIF, AVIF and TIFF all work.
 * @param {string} url - The URL of the image to process
 * @param {number} bucketSize - The bucket size for color quantization (default: 4)
 * @returns {Promise<Array>} - A promise that resolves to the color palette
 */
export const generatePalette = async (url, bucketSize = 4) => {
  if (!url) {
    throw new Error('Missing image URL');
  }

  const imageResponse = await fetchWithRetry(url);
  const contentType = imageResponse.headers.get('content-type');
  const arrayBuffer = await imageResponse.arrayBuffer();

  let decoded;
  try {
    decoded = await sharp(Buffer.from(arrayBuffer))
      .resize(DECODE_MAX_DIMENSION, DECODE_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    throw new Error(`Unsupported image type: ${contentType || 'unknown'} (${err.message})`);
  }

  const { data, info } = decoded;
  const peeper = new PixelPeeper();
  peeper.ExtractPixels({ data, width: info.width, height: info.height });
  return peeper.GetColorPalette(bucketSize);
};

export default {
  generatePalette
};
