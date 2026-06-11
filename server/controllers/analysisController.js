import { analyzePreview } from '../services/audioAnalysisService.js';
import { MOOD_TAXONOMY } from '../helpers/moodEngine.js';

/**
 * POST /analysis/track
 * Body: { previewUrl: string, spotifyId?: string, persist?: boolean }
 *
 * Analyzes a preview clip and returns audio features + derived mood.
 * When spotifyId is provided (and persist isn't explicitly false), the
 * computed features and mood are stored on the track.
 */
export const analyzeTrack = async (req, res) => {
  const { previewUrl, spotifyId, persist = true } = req.body || {};

  if (!previewUrl) {
    return res.status(400).json({ error: 'previewUrl is required' });
  }

  try {
    const analysis = await analyzePreview(previewUrl);

    let persisted = false;
    if (spotifyId && persist) {
      try {
        await req.spotifyService.updateTrackAudioFeatures(
          spotifyId,
          {
            tempo: analysis.features.tempo,
            energy: analysis.features.energy,
            loudness: analysis.features.loudness,
            danceability: analysis.features.danceability,
            valence: analysis.features.valence,
            acousticness: analysis.features.acousticness,
            mood: analysis.mood.mood,
            audio_analysis: JSON.stringify(analysis),
          },
          'processed'
        );
        persisted = true;
      } catch (err) {
        // Analysis is still useful without persistence (e.g. track not stored yet)
        console.warn(`Could not persist analysis for ${spotifyId}:`, err.message);
      }
    }

    return res.status(200).json({ ...analysis, persisted });
  } catch (err) {
    console.error('Audio analysis error:', err);
    if (err.message.includes('Failed to fetch')) {
      return res.status(502).json({ error: err.message });
    }
    if (err.message.includes('Could not decode') || err.message.includes('too short')) {
      return res.status(415).json({ error: err.message });
    }
    return res.status(500).json({ error: `Error analyzing audio: ${err.message}` });
  }
};

/**
 * GET /analysis/moods
 * Returns the mood taxonomy so clients can map moods to visuals.
 */
export const getMoodTaxonomy = (_req, res) => {
  return res.status(200).json(MOOD_TAXONOMY);
};

export default { analyzeTrack, getMoodTaxonomy };
