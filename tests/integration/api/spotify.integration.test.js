import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createDatabaseConnection } from '../../../server/db/connection.js';
import { createApp } from '../../../server/server.js';
import request from 'supertest';
import { testTracks, testAlbums, bulkTracks } from '../../helpers/testData.js';

describe('Spotify API Integration Tests', () => {
  let container;
  let testDb;
  let app;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    testDb = createDatabaseConnection(container.getConnectionUri());
    await testDb.migrate.latest();
    app = createApp(testDb);
  });

  afterAll(async () => {
    if (testDb) await testDb.destroy();
    if (container) await container.stop();
  });

  beforeEach(async () => {
    await testDb('tracks').del();
    await testDb('albums').del();
  });

  describe('POST /spotify/tracks - Create Single Track', () => {
    test('should create a new track with all audio features fields defaulted', async () => {
      const response = await request(app)
        .post('/spotify/tracks')
        .send(testTracks.valid)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('insertedId');

      const track = await testDb('tracks')
        .where({ spotifyId: testTracks.valid.spotifyId })
        .first();
      
      expect(track).toBeDefined();
      expect(track.audio_features_status).toBe('unprocessed');
      expect(track.popularity).toBeNull();
      expect(track.track_genre).toBeNull();
      expect(track.danceability).toBeNull();
      expect(track.energy).toBeNull();
    });

    test('should handle duplicate spotifyId gracefully', async () => {
      await request(app).post('/spotify/tracks').send(testTracks.valid).expect(201);
      const response = await request(app).post('/spotify/tracks').send(testTracks.valid).expect(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should reject track with missing required fields', async () => {
      const response = await request(app)
        .post('/spotify/tracks')
        .send({ spotifyId: 'incomplete' })
        .expect(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /spotify/tracks/:id - Get Single Track', () => {
    test('should retrieve track with all audio features fields', async () => {
      await request(app).post('/spotify/tracks').send(testTracks.valid).expect(201);
      const response = await request(app)
        .get(`/spotify/tracks/${testTracks.valid.spotifyId}`)
        .expect(200);

      const audioFeatureFields = [
        'album_name', 'track_name', 'popularity', 'duration_ms', 'explicit',
        'danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness',
        'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo',
        'time_signature', 'track_genre', 'audio_features_status'
      ];
      audioFeatureFields.forEach(field => expect(response.body).toHaveProperty(field));
      expect(response.body.audio_features_status).toBe('unprocessed');
      expect(response.body.spotifyId).toBe(testTracks.valid.spotifyId);
    });

    test('should return 404 for non-existent track', async () => {
      const response = await request(app)
        .get('/spotify/tracks/non-existent-id')
        .expect(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /spotify/tracks/bulk - Create Multiple Tracks', () => {
    test('should create multiple tracks with audio features defaults', async () => {
      const response = await request(app)
        .post('/spotify/tracks/bulk')
        .send(bulkTracks)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.inserted.count).toBe(3);
      expect(response.body.skipped.count).toBe(0);

      const tracks = await testDb('tracks').select('*');
      expect(tracks.length).toBe(3);
      tracks.forEach(track => {
        expect(track.audio_features_status).toBe('unprocessed');
        expect(track.popularity).toBeNull();
        expect(track.danceability).toBeNull();
      });
    });

    test('should handle mixed new and existing tracks', async () => {
      await request(app).post('/spotify/tracks').send(testTracks.valid).expect(201);
      const bulkData = [testTracks.valid, ...bulkTracks];
      const response = await request(app)
        .post('/spotify/tracks/bulk')
        .send(bulkData)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.inserted.count).toBe(3);
      expect(response.body.skipped.count).toBe(1);
    });
  });

  describe('Audio Features Database Schema', () => {
    test('should enforce enum constraint on audio_features_status', async () => {
      const [track] = await testDb('tracks')
        .insert({
          spotifyId: 'enum-test',
          title: 'Test',
          artists: 'Test Artist',
          album: 'Test Album',
          albumCover: 'http://example.com',
          songUrl: 'http://spotify.com',
          colourPalette: { palette: [[1, 2, 3]] }
        })
        .returning('*');

      expect(track.audio_features_status).toBe('unprocessed');

      await expect(
        testDb('tracks').where({ id: track.id }).update({ audio_features_status: 'invalid-status' })
      ).rejects.toThrow();

      await expect(
        testDb('tracks').where({ id: track.id }).update({ audio_features_status: 'processing' })
      ).resolves.not.toThrow();
    });

    test('should allow null values for all audio feature fields', async () => {
      const [track] = await testDb('tracks')
        .insert({
          spotifyId: 'null-test',
          title: 'Test',
          artists: 'Test Artist',
          album: 'Test Album',
          albumCover: 'http://example.com',
          songUrl: 'http://spotify.com',
          colourPalette: { palette: [[1, 2, 3]] },
          popularity: null,
          danceability: null,
          energy: null,
          track_genre: null
        })
        .returning('*');

      expect(track.popularity).toBeNull();
      expect(track.danceability).toBeNull();
      expect(track.energy).toBeNull();
      expect(track.track_genre).toBeNull();
    });

    test('should accept valid audio features data', async () => {
      const audioFeaturesData = {
        popularity: 85,
        duration_ms: 240000,
        explicit: false,
        danceability: 0.735,
        energy: 0.578,
        key: 1,
        loudness: -5.883,
        mode: 1,
        speechiness: 0.0609,
        acousticness: 0.00242,
        instrumentalness: 0.000002,
        liveness: 0.0813,
        valence: 0.653,
        tempo: 125.049,
        time_signature: 4,
        track_genre: 'pop'
      };

      const [track] = await testDb('tracks')
        .insert({
          spotifyId: 'features-test',
          title: 'Test',
          artists: 'Test Artist',
          album: 'Test Album',
          albumCover: 'http://example.com',
          songUrl: 'http://spotify.com',
          colourPalette: { palette: [[1, 2, 3]] },
          audio_features_status: 'processed',
          ...audioFeaturesData
        })
        .returning('*');

      expect(track.popularity).toBe(85);
      expect(track.danceability).toBeCloseTo(0.735);
      expect(track.energy).toBeCloseTo(0.578);
      expect(track.track_genre).toBe('pop');
      expect(track.audio_features_status).toBe('processed');
    });
  });

  describe('GET /spotify/albums/:id - Get Tracks by Album', () => {
    test('should retrieve tracks for an album with audio features', async () => {
      const albumId = 'test-album-shared';
      const tracksInAlbum = [
        { ...testTracks.valid, spotifyId: 'track-1', spotifyAlbumId: albumId },
        { ...testTracks.minimal, spotifyId: 'track-2', spotifyAlbumId: albumId }
      ];

      for (const track of tracksInAlbum) {
        await request(app).post('/spotify/tracks').send(track).expect(201);
      }

      const response = await request(app).get(`/spotify/albums/${albumId}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach(track => {
        expect(track).toHaveProperty('audio_features_status', 'unprocessed');
        expect(track).toHaveProperty('popularity', null);
        expect(track).toHaveProperty('track_genre', null);
      });
    });

    test('should return empty array for non-existent album', async () => {
      const response = await request(app).get('/spotify/albums/non-existent-album').expect(200);
      expect(response.body).toEqual([]);
    });
  });
});

