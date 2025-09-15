import { createTracksCollection, createAlbumCollection } from "../db/connection.js";

/**
 * Create Spotify service with database dependency injection
 * @param {Object} database - Knex database instance
 * @param {Object} options - Options object
 * @param {Object} options.tracksCollection - Tracks collection interface
 * @param {Object} options.albumCollection - Album collection interface
 * @returns {Object} - Spotify service instance
 */
export function createSpotifyService(database, options = {}) {
  const tracks = options.tracksCollection || createTracksCollection(database);
  const albums = options.albumCollection || createAlbumCollection(database);
  
  // Normalize palette input from clients (array, object, or JSON string)
  const normalizePalette = (value, fieldName = 'colourPalette') => {
    if (value == null) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return normalizePalette(parsed, fieldName);
      } catch (e) {
        throw new Error(`Invalid ${fieldName} JSON`);
      }
    }
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      if (Array.isArray(value.palette)) return value.palette;
      return value; // allow object forms
    }
    throw new Error(`Invalid ${fieldName} type`);
  };
  
  return {
    /**
     * Find a single track by spotifyId
     * @param {string} spotifyId - The Spotify track ID
     * @returns {Promise<Object>} - The track object or null if not found
     */
    async getTrackById(spotifyId) {
      return tracks.findOne({ spotifyId });
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
    
    return database('tracks').whereIn('spotifyId', spotifyIds);
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
    const album = await database('albums').where({ spotifyId: albumId }).first();
    
    if (!album) {
      return [];
    }
    
    // Then find all tracks with the album's primary key
    return tracks.find({ album_id: album.id });
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
    const existing = await tracks.findOne({ spotifyId: trackData.spotifyId });
    if (existing) {
      return {
        success: false,
        existing,
        message: "Record with this spotifyId already exists - no changes made"
      };
    }

    // Normalize palettes from incoming payloads
    const albumColourPalette = normalizePalette(trackData.albumColourPalette, 'albumColourPalette');
    const trackColourPalette = normalizePalette(trackData.colourPalette, 'colourPalette');
    // Debug logging removed after validation

    // Check if album already exists
    const album = await albums.findOne({ spotifyId: trackData.spotifyAlbumId });
    if (!album) {
      // Create new album with spotifyId
      const newAlbum = {
        spotifyId: trackData.spotifyAlbumId,
        album: trackData.album,
        artists: trackData.artists,
        albumCover: trackData.albumCover,
        // For JSONB columns, pass JSON string to avoid pg array literal encoding
        colourPalette: JSON.stringify(albumColourPalette),
      };
      // Insert album
      const result = await albums.insertOne(newAlbum);
      trackData.album_id = result[0].id;
    } else {
      // Use existing album's ID
      trackData.album_id = album.id;
    }
    
    // Format the track data, allowing optional Spotify audio features
    const newTrack = {
      spotifyId: trackData.spotifyId,
      title: trackData.title,
      artists: trackData.artists,
      album: trackData.album,
      albumCover: trackData.albumCover,
      songUrl: trackData.songUrl,
      // For JSONB columns, pass JSON string to avoid pg array literal encoding
      colourPalette: JSON.stringify(trackColourPalette),
      album_id: trackData.album_id,
    };

    // Map optional audio feature/stat fields if provided from the frontend
    const audioFeatureFields = [
      'album_name',
      'track_name',
      'popularity',
      'duration_ms',
      'explicit',
      'danceability',
      'energy',
      'key',
      'loudness',
      'mode',
      'speechiness',
      'acousticness',
      'instrumentalness',
      'liveness',
      'valence',
      'tempo',
      'time_signature',
      'track_genre',
      'audio_features_status'
    ];

    let anyAudioFeatureProvided = false;
    for (const field of audioFeatureFields) {
      if (typeof trackData[field] !== 'undefined' && trackData[field] !== null) {
        newTrack[field] = trackData[field];
        if (field !== 'audio_features_status') anyAudioFeatureProvided = true;
      }
    }

    // Provide sensible defaults for names if not explicitly set
    if (typeof newTrack.album_name === 'undefined' && typeof trackData.album !== 'undefined') {
      newTrack.album_name = trackData.album;
    }
    if (typeof newTrack.track_name === 'undefined' && typeof trackData.title !== 'undefined') {
      newTrack.track_name = trackData.title;
    }

    // If audio features were provided but status not set, mark as 'imported'
    if (anyAudioFeatureProvided && typeof newTrack.audio_features_status === 'undefined') {
      newTrack.audio_features_status = 'imported';
    }
    
    // Insert the record
    const result = await tracks.insertOne(newTrack);
    
    return {
      success: true,
      insertedId: result[0].id,
      track: result[0]
    };
  },

  /**
   * Create a new Spotify album record
   * @param {Object} albumData - The album data
   * @returns {Promise<Object>} - Result object with success status and album data
   */
  async createAlbum(albumData) {
    // Validate required fields
    if (!albumData.spotifyId || !albumData.album || !albumData.artists) {
      throw new Error("Missing required fields: spotifyId, album, and artists are required");
    }
    
    // Check if album already exists
    const existing = await albums.findOne({ spotifyId: albumData.spotifyId });
    if (existing) {
      return {
        success: false,
        existing,
        message: "Album with this spotifyId already exists - no changes made"
      };
    }
    
    // Format the album data
    const newAlbum = {
      spotifyId: albumData.spotifyId,
      album: albumData.album,
      artists: albumData.artists,
      albumCover: albumData.albumCover || "",
      // For JSONB columns, pass JSON string to avoid pg array literal encoding
      colourPalette: JSON.stringify(normalizePalette(albumData.colourPalette || [], 'colourPalette'))
    };
    
    // Insert the album
    const result = await albums.insertOne(newAlbum);
    
    return {
      success: true,
      insertedId: result[0].id,
      album: result[0]
    };
  },

  /**
   * Update audio features for a track (for queue processing)
   * @param {string} spotifyId - The Spotify track ID
   * @param {Object} audioFeaturesData - Audio features data
   * @param {string} status - Processing status ('processed', 'failed', 'imported')
   * @returns {Promise<Object>} - Update result
   */
  async updateTrackAudioFeatures(spotifyId, audioFeaturesData, status = 'processed') {
    if (!spotifyId) {
      throw new Error('spotifyId is required');
    }

    const updateData = {
      ...audioFeaturesData,
      audio_features_status: status,
      updated_at: new Date()
    };

    const result = await database('tracks')
      .where({ spotifyId })
      .update(updateData)
      .returning('*');

    if (result.length === 0) {
      throw new Error(`Track with spotifyId ${spotifyId} not found`);
    }

    return {
      success: true,
      track: result[0]
    };
  },

  /**
   * Get unprocessed tracks for queue processing
   * @param {number} limit - Maximum number of tracks to return
   * @returns {Promise<Object[]>} - Array of unprocessed tracks
   */
  async getUnprocessedTracks(limit = 100) {
    return database('tracks')
      .where({ audio_features_status: 'unprocessed' })
      .orderBy('created_at', 'asc')
      .limit(limit);
  },

  /**
   * Update processing status for a track
   * @param {string} spotifyId - The Spotify track ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Update result
   */
  async updateProcessingStatus(spotifyId, status) {
    if (!spotifyId || !status) {
      throw new Error('spotifyId and status are required');
    }

    const result = await database('tracks')
      .where({ spotifyId })
      .update({ 
        audio_features_status: status,
        updated_at: new Date()
      })
      .returning(['id', 'spotifyId', 'audio_features_status']);

    if (result.length === 0) {
      throw new Error(`Track with spotifyId ${spotifyId} not found`);
    }

    return {
      success: true,
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
      !item.spotifyId || !item.title || !item.artists);
    
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
    const trx = await database.transaction();
    
    try {
      // Check which IDs already exist in the database
      const existingTracks = await trx('tracks')
        .whereIn('spotifyId', spotifyIds);
      
      let newDocuments = [];
      let skippedTracks = [];
      
      if (existingTracks.length > 0) {
        // Some tracks already exist in database
        const existingIds = existingTracks.map(record => record.spotifyId);
        
        // Filter out existing tracks
        newDocuments = tracksData.filter(item => !existingIds.includes(item.spotifyId));
        skippedTracks = existingTracks;
      } else {
        // No existing tracks found
        newDocuments = tracksData;
      }
      
      // Format the documents for insertion (allowing optional audio features)
      const formattedDocuments = newDocuments.map((data) => {
        const doc = {
          spotifyId: data.spotifyId,
          title: data.title,
          artists: data.artists,
          album: data.album || "",
          albumCover: data.albumCover || "",
          songUrl: data.songUrl || "",
          // For JSONB columns, pass JSON string to avoid pg array literal encoding
          colourPalette: JSON.stringify(normalizePalette(data.colourPalette || [], 'colourPalette')),
        };

        const audioFields = [
          'album_name', 'track_name', 'popularity', 'duration_ms', 'explicit', 'danceability',
          'energy', 'key', 'loudness', 'mode', 'speechiness', 'acousticness', 'instrumentalness',
          'liveness', 'valence', 'tempo', 'time_signature', 'track_genre', 'audio_features_status'
        ];

        let anyProvided = false;
        for (const f of audioFields) {
          if (typeof data[f] !== 'undefined' && data[f] !== null) {
            doc[f] = data[f];
            if (f !== 'audio_features_status') anyProvided = true;
          }
        }

        if (typeof doc.album_name === 'undefined' && typeof data.album !== 'undefined') {
          doc.album_name = data.album;
        }
        if (typeof doc.track_name === 'undefined' && typeof data.title !== 'undefined') {
          doc.track_name = data.title;
        }

        if (anyProvided && typeof doc.audio_features_status === 'undefined') {
          doc.audio_features_status = 'imported';
        }

        return doc;
      });
      
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
          count: skippedTracks.length,
          tracks: skippedTracks.map(r => ({ spotifyId: r.spotifyId, id: r.id }))
        },
        total: {
          processed: tracksData.length,
          inserted: insertedIds.length,
          skipped: skippedTracks.length
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await trx.rollback();
      throw error;
    }
  }
  };
}
