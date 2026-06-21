/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema
    .raw("CREATE TYPE audio_features_status_enum AS ENUM ('unprocessed', 'processing', 'processed', 'failed', 'imported')")
    .then(() => {
      return knex.schema.alterTable('tracks', table => {
        // Spotify audio features columns (all nullable, populated by queue later)
        table.string('album_name');
        table.string('track_name');
        table.integer('popularity'); // 0-100
        table.integer('duration_ms');
        table.boolean('explicit');
        table.decimal('danceability', 5, 3); // 0.0-1.0
        table.decimal('energy', 5, 3); // 0.0-1.0
        table.integer('key'); // -1 to 11
        table.decimal('loudness', 8, 3); // dB values
        table.integer('mode'); // 0 or 1
        table.decimal('speechiness', 5, 3); // 0.0-1.0
        table.decimal('acousticness', 5, 3); // 0.0-1.0
        table.decimal('instrumentalness', 5, 3); // 0.0-1.0
        table.decimal('liveness', 5, 3); // 0.0-1.0
        table.decimal('valence', 5, 3); // 0.0-1.0
        table.decimal('tempo', 8, 3); // BPM values
        table.integer('time_signature'); // 3-7
        table.string('track_genre');
        
        // Processing status enum with default
        table
          .enu('audio_features_status', null, {
            useNative: true,
            enumName: 'audio_features_status_enum',
          })
          .defaultTo('unprocessed');
        
        // Indexes for efficient queue processing
        table.index('audio_features_status', 'idx_tracks_audio_features_status');
        table.index(['audio_features_status', 'created_at'], 'idx_tracks_audio_status_created');
      });
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema
    .alterTable('tracks', table => {
      // Drop indexes first
      table.dropIndex('audio_features_status', 'idx_tracks_audio_features_status');
      table.dropIndex(['audio_features_status', 'created_at'], 'idx_tracks_audio_status_created');
      
      // Drop columns
      table.dropColumn('album_name');
      table.dropColumn('track_name');
      table.dropColumn('popularity');
      table.dropColumn('duration_ms');
      table.dropColumn('explicit');
      table.dropColumn('danceability');
      table.dropColumn('energy');
      table.dropColumn('key');
      table.dropColumn('loudness');
      table.dropColumn('mode');
      table.dropColumn('speechiness');
      table.dropColumn('acousticness');
      table.dropColumn('instrumentalness');
      table.dropColumn('liveness');
      table.dropColumn('valence');
      table.dropColumn('tempo');
      table.dropColumn('time_signature');
      table.dropColumn('track_genre');
      table.dropColumn('audio_features_status');
    })
    .then(async () => {
      // Drop the enum types
      await knex.raw('DROP TYPE IF EXISTS audio_features_status_enum');
      await knex.raw('DROP TYPE IF EXISTS enum_tracks_audio_features_status');
    });
}