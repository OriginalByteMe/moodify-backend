import knex from 'knex';
import { MockClient, createTracker } from 'knex-mock-client';
import { createSpotifyService } from '../../../server/services/spotifyService.js';
import { testTracks, bulkTracks } from '../../helpers/testData.js';

describe('SpotifyService (with knex-mock-client)', () => {
  let db;
  let tracker;
  let service;

  beforeAll(() => {
    db = knex({ client: MockClient });
    tracker = createTracker(db);
    service = createSpotifyService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    tracker.reset();
  });

  describe('getTrackById', () => {
    test('returns a track when it exists', async () => {
      const track = { id: 1, ...testTracks.valid };
      tracker.on.select('tracks').response([track]);
      const result = await service.getTrackById(track.spotifyId);
      expect(result).toEqual(track);
    });

    test('returns undefined when the track does not exist', async () => {
      tracker.on.select('tracks').response([]);
      const result = await service.getTrackById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getTracksByIds', () => {
    test('returns tracks for valid IDs', async () => {
      tracker.on.select('tracks').response(bulkTracks.map((t, i) => ({ id: i + 1, ...t })));
      const result = await service.getTracksByIds(bulkTracks.map(t => t.spotifyId));
      expect(result).toHaveLength(bulkTracks.length);
      expect(result.map(r => r.spotifyId).sort()).toEqual(bulkTracks.map(t => t.spotifyId).sort());
    });

    test('throws an error for invalid input', async () => {
      await expect(service.getTracksByIds(null)).rejects.toThrow('Invalid or empty spotifyIds array');
      await expect(service.getTracksByIds([])).rejects.toThrow('Invalid or empty spotifyIds array');
    });
  });

  describe('getTracksByAlbumId', () => {
    test('returns [] when album not found', async () => {
      tracker.on.select('albums').response([]);
      const result = await service.getTracksByAlbumId('missing');
      expect(result).toEqual([]);
    });

    test('returns tracks when album exists', async () => {
      const album = { id: 10, spotifyId: 'album-123' };
      const tracks = [
        { id: 1, ...testTracks.valid, album_id: album.id },
        { id: 2, ...testTracks.minimal, album_id: album.id }
      ];
      tracker.on.select('albums').response([album]);
      tracker.on.select('tracks').response(tracks);
      const result = await service.getTracksByAlbumId(album.spotifyId);
      expect(result).toEqual(tracks);
    });
  });

  describe('createTrack', () => {
    test('throws on missing required fields', async () => {
      await expect(service.createTrack({})).rejects.toThrow('Missing required fields');
    });

    test('returns existing track if it already exists', async () => {
      const existingTrack = { id: 1, ...testTracks.valid };
      tracker.on.select('tracks').response([existingTrack]); // findOne for track
      const result = await service.createTrack(testTracks.valid);
      expect(result.success).toBe(false);
      expect(result.existing).toEqual(existingTrack);
    });

    test('creates a new album when missing, then inserts track', async () => {
      const newTrack = { ...testTracks.valid };
      const newAlbum = {
        id: 42,
        spotifyId: newTrack.spotifyAlbumId,
        album: newTrack.album,
        artists: newTrack.artists,
        albumCover: newTrack.albumCover,
        colourPalette: newTrack.albumColourPalette
      };

      // 1) No track exists
      tracker.on.select('tracks').response([]);
      // 2) Album lookup by spotifyAlbumId returns none
      tracker.on.select('albums').response([]);
      // 3) Insert album
      tracker.on.insert('albums').response([newAlbum]);
      // 4) Insert track
      const insertedTrack = { id: 99, ...newTrack, album_id: newAlbum.id };
      tracker.on.insert('tracks').response([insertedTrack]);

      const result = await service.createTrack(newTrack);
      expect(result.success).toBe(true);
      expect(result.insertedId).toBe(insertedTrack.id);
      expect(result.track).toEqual(insertedTrack);
    });
  });
});
