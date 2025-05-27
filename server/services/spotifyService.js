import db, { spotifyCollection } from "../db/connection.js";

/**
 * Service layer for Spotify track operations
 * Handles all business logic for Spotify data
 */
export const spotifyService = {
  /**
   * Find a single track by spotifyId
   * @param {string} spotifyId - The Spotify track ID
   * @returns {Promise<Object>} - The track object or null if not found
   */
  async getTrackById(spotifyId) {
    return spotifyCollection.findOne({ spotifyId });
  },

  /**
   * Get multiple tracks by their spotifyIds
   * @param {string[]} spotifyIds - Array of Spotify track IDs
   * @returns {Promise<Object[]>} - Array of track objects
   */
  async getTracksByIds(spotifyIds) {
    if (!Array.isArray(spotifyIds) || spotifyIds.length === 0) {
      throw new Error("Invalid or empty spotifyIds array");
    }
    
    return spotifyCollection.find({ spotifyId: { in: spotifyIds } });
  },

  /**
   * Create a new Spotify track record
   * @param {Object} trackData - The track data
   * @returns {Promise<Object>} - Result object with success status and track data
   */
  async createTrack(trackData) {
    // Validate required fields
    if (!trackData.spotifyId || !trackData.title || !trackData.artists) {
      throw new Error("Missing required fields: spotifyId, title, and artists are required");
    }
    
    // Check if record already exists
    const existing = await spotifyCollection.findOne({ spotifyId: trackData.spotifyId });
    if (existing) {
      return {
        success: false,
        existing,
        message: "Record with this spotifyId already exists - no changes made"
      };
    }
    
    // Format the track data
    const newTrack = {
      spotifyId: trackData.spotifyId,
      title: trackData.title,
      artists: trackData.artists,
      album: trackData.album,
      albumCover: trackData.albumCover,
      songUrl: trackData.songUrl,
      colourPalette: trackData.colourPalette,
    };
    
    // Insert the record
    const result = await spotifyCollection.insertOne(newTrack);
    
    return {
      success: true,
      insertedId: result[0].id,
      track: result[0]
    };
  },

  /**
   * Create multiple Spotify track records in bulk
   * @param {Object[]} tracksData - Array of track data objects
   * @returns {Promise<Object>} - Result object with success and insertion stats
   */
  async createBulkTracks(tracksData) {
    // Validate input
    if (!Array.isArray(tracksData) || tracksData.length === 0) {
      throw new Error("Request body must be a non-empty array of Spotify track objects");
    }
    
    // Validate all documents have required fields
    const invalidItems = tracksData.filter(item => 
      !item.spotifyId || !item.title || !Array.isArray(item.artists));
    
    if (invalidItems.length > 0) {
      throw new Error("Some items are missing required fields (spotifyId, title, artists)");
    }
    
    // Check for duplicate spotifyIds within the request body
    const spotifyIds = tracksData.map(item => item.spotifyId);
    const uniqueIds = new Set(spotifyIds);
    
    if (uniqueIds.size !== spotifyIds.length) {
      const duplicatesInRequest = spotifyIds.filter((id, index) => 
        spotifyIds.indexOf(id) !== index);
      
      throw new Error(`Request contains duplicate spotifyIds: ${[...new Set(duplicatesInRequest)].join(', ')}`);
    }
    
    // Start a transaction
    const trx = await db.transaction();
    
    try {
      // Check which IDs already exist in the database
      const existingRecords = await trx('spotify')
        .whereIn('spotifyId', spotifyIds);
      
      let newDocuments = [];
      let skippedRecords = [];
      
      if (existingRecords.length > 0) {
        // Some records already exist in database
        const existingIds = existingRecords.map(record => record.spotifyId);
        
        // Filter out existing records
        newDocuments = tracksData.filter(item => !existingIds.includes(item.spotifyId));
        skippedRecords = existingRecords;
      } else {
        // No existing records found
        newDocuments = tracksData;
      }
      
      // Format the documents for insertion
      const formattedDocuments = newDocuments.map((data) => ({
        spotifyId: data.spotifyId,
        title: data.title,
        artists: data.artists,
        album: data.album || "",
        albumCover: data.albumCover || "",
        songUrl: data.songUrl || "",
        colourPalette: data.colourPalette || [],
      }));
      
      let insertedIds = [];
      
      // Only attempt to insert if we have new documents
      if (formattedDocuments.length > 0) {
        const results = await trx('spotify')
          .insert(formattedDocuments)
          .returning(['id', 'spotifyId']);
        
        insertedIds = results.map(r => ({ id: r.id, spotifyId: r.spotifyId }));
      }
      
      // Commit the transaction
      await trx.commit();
      
      // Return result stats
      return {
        success: true,
        inserted: {
          count: insertedIds.length,
          ids: insertedIds
        },
        skipped: {
          count: skippedRecords.length,
          records: skippedRecords.map(r => ({ spotifyId: r.spotifyId, id: r.id }))
        },
        total: {
          processed: tracksData.length,
          inserted: insertedIds.length,
          skipped: skippedRecords.length
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await trx.rollback();
      throw error;
    }
  }
};

export default spotifyService;
