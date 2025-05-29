import db, { tracksCollection, albumCollection } from "../db/connection.js";

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
    return tracksCollection.findOne({ spotifyId });
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
    
    return tracksCollection.find({ spotifyId: { in: spotifyIds } });
  },

  /**
   * Get multiple tracks by their Spotify album ID
   * @param {string} albumId - The Spotify album ID
   * @returns {Promise<Object[]>} - Array of track objects
   */
  async getTracksByAlbumId(albumId) {
    if (!albumId) {
      throw new Error("Invalid or empty albumId");
    }
    
    // First find the album by its Spotify ID
    const album = await db('albums').where({ spotifyId: albumId }).first();
    
    if (!album) {
      return [];
    }
    
    // Then find all tracks with the album's primary key
    return tracksCollection.find({ album_id: album.id });
  },

  /**
   * Create a new Spotify track record
   * @param {Object} trackData - The track data
   * @returns {Promise<Object>} - Result object with success status and track data
   */
  async createTrack(trackData) {
    // Validate required fields
    if (!trackData.spotifyId || !trackData.title || !trackData.artists || !trackData.spotifyAlbumId || !trackData.albumCover || !trackData.albumColourPalette) {
      throw new Error("Missing required fields: spotifyId, title, artists, spotifyAlbumId, albumCover, and albumColourPalette are required");
    }
    
    // Check if record already exists
    const existing = await tracksCollection.findOne({ spotifyId: trackData.spotifyId });
    if (existing) {
      return {
        success: false,
        existing,
        message: "Record with this spotifyId already exists - no changes made"
      };
    }

    // Chekc if album already exists
    const album = await albumCollection.findOne({ spotifyId: trackData.spotifyAlbumId });
    if (!album) {
      // Create new album with spotifyId
      const newAlbum = {
        spotifyId: trackData.spotifyAlbumId,
        album: trackData.album,
        albumCover: trackData.albumCover,
        colourPalette: JSON.stringify(trackData.albumColourPalette),
      };
      const result = await albumCollection.insertOne(newAlbum);
      trackData.album_id = result.insertedId;
    }
    
    // Format the track data
    const newTrack = {
      spotifyId: trackData.spotifyId,
      title: trackData.title,
      artists: trackData.artists,
      album: trackData.album,
      albumCover: trackData.albumCover,
      songUrl: trackData.songUrl,
      colourPalette: JSON.stringify(trackData.colourPalette),
      album_id: trackData.album_id,
    };
    
    // Insert the record
    const result = await tracksCollection.insertOne(newTrack);
    
    return {
      success: true,
      insertedId: result[0].id,
      track: result[0]
    };
  },

  /**
   * Create multiple Spotify track tracks in bulk
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
      const existingtracks = await trx('tracks')
        .whereIn('spotifyId', spotifyIds);
      
      let newDocuments = [];
      let skippedtracks = [];
      
      if (existingtracks.length > 0) {
        // Some tracks already exist in database
        const existingIds = existingtracks.map(record => record.spotifyId);
        
        // Filter out existing tracks
        newDocuments = tracksData.filter(item => !existingIds.includes(item.spotifyId));
        skippedtracks = existingtracks;
      } else {
        // No existing tracks found
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
        colourPalette: JSON.stringify(data.colourPalette || []),
      }));
      
      let insertedIds = [];
      
      // Only attempt to insert if we have new documents
      if (formattedDocuments.length > 0) {
        const results = await trx('tracks')
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
          count: skippedtracks.length,
          tracks: skippedtracks.map(r => ({ spotifyId: r.spotifyId, id: r.id }))
        },
        total: {
          processed: tracksData.length,
          inserted: insertedIds.length,
          skipped: skippedtracks.length
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
