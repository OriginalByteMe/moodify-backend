import PixelPeeper from "../helpers/PixelPeeper.js";
import jpeg from 'jpeg-js';
import png from 'png-js';

/**
 * Generate a color palette from an image URL
 * @param {string} url - The URL of the image to process
 * @param {number} bucketSize - The bucket size for color quantization (default: 4)
 * @returns {Promise<Array>} - A promise that resolves to the color palette
 */
export const generatePalette = async (url, bucketSize = 4) => {
  if (!url) {
    throw new Error('Missing image URL');
  }

  // Fetch the image
  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  const contentType = imageResponse.headers.get('content-type');
  const arrayBuffer = await imageResponse.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const peeper = new PixelPeeper();
  
  // Process based on image type
  if (contentType.includes('image/jpeg')) {
    const imageData = jpeg.decode(uint8Array, { useTArray: true });
    peeper.ExtractPixels(imageData);
    return peeper.GetColorPalette(bucketSize);
  } 
  
  if (contentType.includes('image/png')) {
    const imageData = png.decode(Buffer.from(uint8Array));
    peeper.ExtractPixels(imageData);
    return peeper.GetColorPalette(bucketSize);
  }
  
  throw new Error(`Unsupported image type: ${contentType}`);
};

export default {
  generatePalette
};
