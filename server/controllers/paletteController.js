import { generatePalette } from '../services/paletteService.js';

/**
 * Controller method for palette generation endpoint
 */
export const createPalette = async (req, res) => {
  try {
    const url = req.query.image_url;
    const bucketSize = parseInt(req.query.bucketSize) || 4;
    
    console.log("Palettizer endpoint called with parameters:", req.query);
    
    if (!url) {
      return res.status(400).send('Missing image_url parameter');
    }
    
    const palette = await generatePalette(url, bucketSize);
    return res.status(200).json(palette);
  } catch (err) {
    console.error('Palette generation error:', err);
    
    // Send appropriate error responses based on error type
    if (err.message.includes('Missing image')) {
      return res.status(400).send(err.message);
    } else if (err.message.includes('Failed to fetch')) {
      return res.status(502).send(err.message);
    } else if (err.message.includes('Unsupported image type')) {
      return res.status(415).send(err.message);
    }
    
    // Generic error
    return res.status(500).send(`Error creating colour palette: ${err.message}`);
  }
};

export default {
  createPalette,
  generatePalette
};
