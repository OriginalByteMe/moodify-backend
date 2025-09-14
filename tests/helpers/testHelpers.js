/**
 * Test helpers for database operations and API testing
 */
import request from 'supertest';

/**
 * Insert a track directly into the database for testing
 */
export async function insertTestTrack(trackData, db = global.testDb) {
  const result = await db('tracks').insert(trackData).returning('*');
  return result[0];
}

/**
 * Insert an album directly into the database for testing
 */
export async function insertTestAlbum(albumData, db = global.testDb) {
  const result = await db('albums').insert(albumData).returning('*');
  return result[0];
}

/**
 * Get all tracks from test database
 */
export async function getAllTracks(db = global.testDb) {
  return await db('tracks').select('*');
}

/**
 * Get all albums from test database
 */
export async function getAllAlbums(db = global.testDb) {
  return await db('albums').select('*');
}

/**
 * Clear all test data from database
 */
export async function clearTestData(db = global.testDb) {
  await db('tracks').del();
  await db('albums').del();
}

/**
 * Get track by spotify ID
 */
export async function getTrackBySpotifyId(spotifyId, db = global.testDb) {
  return await db('tracks').where({ spotifyId }).first();
}

/**
 * Get album by spotify ID
 */
export async function getAlbumBySpotifyId(spotifyId, db = global.testDb) {
  return await db('albums').where({ spotifyId }).first();
}

/**
 * Count records in a table
 */
export async function countRecords(tableName, db = global.testDb) {
  const result = await db(tableName).count('* as count');
  return parseInt(result[0].count);
}

/**
 * Verify audio features are properly null/unprocessed
 */
export function verifyAudioFeaturesDefaults(track) {
  // Check that all audio features fields are null
  const audioFeatureFields = [
    'album_name', 'track_name', 'popularity', 'duration_ms', 'explicit',
    'danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness',
    'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo',
    'time_signature', 'track_genre'
  ];

  audioFeatureFields.forEach(field => {
    expect(track[field]).toBeNull();
  });

  // Check that audio_features_status defaults to 'unprocessed'
  expect(track.audio_features_status).toBe('unprocessed');
}

/**
 * Verify track has all required core fields
 */
export function verifyCoreTrackFields(track) {
  expect(track).toHaveProperty('id');
  expect(track).toHaveProperty('spotifyId');
  expect(track).toHaveProperty('title');
  expect(track).toHaveProperty('artists');
  expect(track).toHaveProperty('album');
  expect(track).toHaveProperty('albumCover');
  expect(track).toHaveProperty('songUrl');
  expect(track).toHaveProperty('colourPalette');
  expect(track).toHaveProperty('created_at');
  expect(track).toHaveProperty('updated_at');
  expect(track).toHaveProperty('audio_features_status');
}

/**
 * Verify album has all required core fields
 */
export function verifyCoreAlbumFields(album) {
  expect(album).toHaveProperty('id');
  expect(album).toHaveProperty('spotifyId');
  expect(album).toHaveProperty('album');
  expect(album).toHaveProperty('artists');
  expect(album).toHaveProperty('albumCover');
  expect(album).toHaveProperty('colourPalette');
  expect(album).toHaveProperty('created_at');
  expect(album).toHaveProperty('updated_at');
}

/**
 * Create test request helper for API testing
 */
export function createTestRequest(app) {
  return {
    get: (path) => request(app).get(path),
    post: (path, data) => request(app).post(path).send(data),
    put: (path, data) => request(app).put(path).send(data),
    delete: (path) => request(app).delete(path)
  };
}