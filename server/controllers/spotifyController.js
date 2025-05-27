import spotifyService from '../services/spotifyService.js';

/**
 * Controller for Spotify track endpoints
 * Handles HTTP requests and responses related to Spotify tracks
 */
export const spotifyController = {
  /**
   * Get a single track by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getTrackById(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ error: "Spotify ID is required." });
      }
      
      const result = await spotifyService.getTrackById(req.params.id);

      if (!result) {
        return res.status(404).json({ error: "Spotify track not found." });
      } 
      
      return res.status(200).json(result);
    } catch (err) {
      console.error("Error retrieving Spotify track:", err);
      return res.status(500).json({ error: "Error retrieving Spotify data" });
    }
  },

  /**
   * Get multiple tracks by their IDs
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getTracksByIds(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids)) {
        return res.status(400).json({ 
          error: "Invalid request body. 'ids' should be an array." 
        });
      }
      
      const results = await spotifyService.getTracksByIds(ids);
      return res.status(200).json(results);
    } catch (err) {
      console.error("Error retrieving Spotify tracks:", err);
      return res.status(500).json({ 
        error: "Error getting spotify data",
        message: err.message
      });
    }
  },

  /**
   * Create a new track
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async createTrack(req, res) {
    try {
      // Validate required fields (additional validation happens in service)
      if (!req.body.spotifyId || !req.body.title || !req.body.artists) {
        return res.status(400).json({
          error: "Missing required fields: spotifyId, title, and artists are required"
        });
      }
      
      const result = await spotifyService.createTrack(req.body);
      
      // If track already exists
      if (!result.success) {
        return res.status(200).json({
          message: result.message,
          existingId: result.existing.id,
          success: false,
          existing: result.existing
        });
      }
      
      // New track created
      return res.status(201).json({
        insertedId: result.insertedId,
        success: true
      });
    } catch (err) {
      console.error("Error creating Spotify track:", err);
      return res.status(500).json({
        error: "Error adding spotify data",
        message: err.message
      });
    }
  },

  /**
   * Create multiple tracks in bulk
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async createBulkTracks(req, res) {
    try {
      const result = await spotifyService.createBulkTracks(req.body);
      return res.status(200).json(result);
    } catch (err) {
      console.error("Error creating bulk Spotify tracks:", err);
      
      // Client errors - return appropriate response
      if (err.message.includes("Request body must be") ||
          err.message.includes("missing required fields") ||
          err.message.includes("duplicate spotifyIds")) {
        return res.status(400).json({
          error: err.message
        });
      }
      
      // Handle PostgreSQL unique constraint violation
      if (err.code === '23505') {
        return res.status(200).json({
          success: true,
          message: "Partial success - some records were inserted, others already existed",
          inserted: { count: 0 },
          skipped: { count: 'unknown', ids: ['unknown'] }
        });
      }
      
      // Generic server error
      return res.status(500).json({
        error: "Error adding spotify data",
        message: err.message
      });
    }
  }
};

export default spotifyController;
