/**
 * Test data generators and fixtures for comprehensive testing
 */

export const testTracks = {
  // Valid track with all required fields
  valid: {
    spotifyId: 'test-track-123',
    title: 'Test Song',
    artists: 'Test Artist',
    album: 'Test Album',
    albumCover: 'https://example.com/cover.jpg',
    songUrl: 'https://spotify.com/track/test-track-123',
    colourPalette: { palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255]] },
    spotifyAlbumId: 'test-album-123',
    albumColourPalette: { palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255]] }
  },

  // Track with minimal required fields
  minimal: {
    spotifyId: 'minimal-track-456',
    title: 'Minimal Song',
    artists: 'Minimal Artist',
    album: 'Minimal Album',
    albumCover: 'https://example.com/minimal.jpg',
    songUrl: 'https://spotify.com/track/minimal-track-456',
    colourPalette: { palette: [[100, 100, 100]] },
    spotifyAlbumId: 'minimal-album-456',
    albumColourPalette: { palette: [[100, 100, 100]] }
  },

  // Track with rich audio features data (for future queue processing tests)
  withAudioFeatures: {
    spotifyId: 'audio-track-789',
    title: 'Audio Features Song',
    artists: 'Audio Artist',
    album: 'Audio Album',
    albumCover: 'https://example.com/audio.jpg',
    songUrl: 'https://spotify.com/track/audio-track-789',
    colourPalette: { palette: [[120, 80, 40]] },
    spotifyAlbumId: 'audio-album-789',
    albumColourPalette: { palette: [[120, 80, 40]] },
    // These would be populated by queue processing
    album_name: 'Audio Album',
    track_name: 'Audio Features Song',
    popularity: 75,
    duration_ms: 210000,
    explicit: false,
    danceability: 0.85,
    energy: 0.72,
    key: 5,
    loudness: -8.5,
    mode: 1,
    speechiness: 0.05,
    acousticness: 0.15,
    instrumentalness: 0.02,
    liveness: 0.12,
    valence: 0.68,
    tempo: 125.4,
    time_signature: 4,
    track_genre: 'Pop',
    audio_features_status: 'processed'
  },

  // Invalid track (missing required fields)
  invalid: {
    spotifyId: 'invalid-track-000',
    title: 'Invalid Song'
    // Missing required fields: artists, album, etc.
  }
};

export const testAlbums = {
  valid: {
    spotifyId: 'test-album-123',
    album: 'Test Album',
    artists: 'Test Artist',
    albumCover: 'https://example.com/cover.jpg',
    colourPalette: { palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255]] }
  },

  minimal: {
    spotifyId: 'minimal-album-456',
    album: 'Minimal Album',
    artists: 'Minimal Artist',
    albumCover: 'https://example.com/minimal.jpg',
    colourPalette: { palette: [[100, 100, 100]] }
  }
};

export const bulkTracks = [
  {
    spotifyId: 'bulk-track-1',
    title: 'Bulk Song 1',
    artists: 'Bulk Artist 1',
    album: 'Bulk Album 1',
    albumCover: 'https://example.com/bulk1.jpg',
    songUrl: 'https://spotify.com/track/bulk-track-1',
    colourPalette: { palette: [[200, 100, 50]] }
  },
  {
    spotifyId: 'bulk-track-2',
    title: 'Bulk Song 2',
    artists: 'Bulk Artist 2',
    album: 'Bulk Album 2',
    albumCover: 'https://example.com/bulk2.jpg',
    songUrl: 'https://spotify.com/track/bulk-track-2',
    colourPalette: { palette: [[150, 200, 100]] }
  },
  {
    spotifyId: 'bulk-track-3',
    title: 'Bulk Song 3',
    artists: 'Bulk Artist 3',
    album: 'Bulk Album 3',
    albumCover: 'https://example.com/bulk3.jpg',
    songUrl: 'https://spotify.com/track/bulk-track-3',
    colourPalette: { palette: [[100, 150, 200]] }
  }
];

/**
 * Generate a random track for testing edge cases
 */
export function generateRandomTrack(overrides = {}) {
  const id = Math.random().toString(36).substr(2, 9);
  
  return {
    spotifyId: `random-${id}`,
    title: `Random Song ${id}`,
    artists: `Random Artist ${id}`,
    album: `Random Album ${id}`,
    albumCover: `https://example.com/${id}.jpg`,
    songUrl: `https://spotify.com/track/random-${id}`,
    colourPalette: { 
      palette: [
        [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]
      ] 
    },
    spotifyAlbumId: `random-album-${id}`,
    albumColourPalette: { 
      palette: [
        [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]
      ] 
    },
    ...overrides
  };
}

/**
 * Generate multiple random tracks
 */
export function generateRandomTracks(count = 5, overrides = {}) {
  return Array.from({ length: count }, () => generateRandomTrack(overrides));
}