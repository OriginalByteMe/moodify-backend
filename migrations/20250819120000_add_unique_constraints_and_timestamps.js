/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema
    .alterTable('tracks', table => {
      // Add unique constraint on spotifyId
      table.unique('spotifyId');
      
      // Add timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Add index on spotifyId for performance
      table.index('spotifyId', 'idx_tracks_spotify_id');
    })
    .alterTable('albums', table => {
      // Add unique constraint on spotifyId
      table.unique('spotifyId');
      
      // Add timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Add index on spotifyId for performance
      table.index('spotifyId', 'idx_albums_spotify_id');
    })
    .then(() => {
      // Create GIN indexes on JSONB columns for color-based queries
      return knex.raw('CREATE INDEX IF NOT EXISTS idx_tracks_colour_palette ON tracks USING GIN ("colourPalette")');
    })
    .then(() => {
      return knex.raw('CREATE INDEX IF NOT EXISTS idx_albums_colour_palette ON albums USING GIN ("colourPalette")');
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema
    .alterTable('tracks', table => {
      // Remove constraints and indexes
      table.dropUnique('spotifyId');
      table.dropIndex('spotifyId', 'idx_tracks_spotify_id');
      
      // Remove timestamps
      table.dropColumn('created_at');
      table.dropColumn('updated_at');
    })
    .alterTable('albums', table => {
      // Remove constraints and indexes
      table.dropUnique('spotifyId');
      table.dropIndex('spotifyId', 'idx_albums_spotify_id');
      
      // Remove timestamps
      table.dropColumn('created_at');
      table.dropColumn('updated_at');
    })
    .then(() => {
      // Drop GIN indexes
      return knex.raw('DROP INDEX IF EXISTS idx_tracks_colour_palette');
    })
    .then(() => {
      return knex.raw('DROP INDEX IF EXISTS idx_albums_colour_palette');
    });
}