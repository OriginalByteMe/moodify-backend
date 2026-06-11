/**
 * Adds first-party mood/genre data to tracks:
 * - mood: derived mood label (see server/helpers/moodEngine.js)
 * - genres: Spotify artist genres as a JSONB string array
 * - audio_analysis: full raw analysis snapshot from /analysis/track
 */
export function up(knex) {
  return knex.schema.alterTable('tracks', (table) => {
    table.string('mood');
    table.jsonb('genres');
    table.jsonb('audio_analysis');
    table.index('mood', 'idx_tracks_mood');
  });
}

export function down(knex) {
  return knex.schema.alterTable('tracks', (table) => {
    table.dropIndex('mood', 'idx_tracks_mood');
    table.dropColumn('mood');
    table.dropColumn('genres');
    table.dropColumn('audio_analysis');
  });
}
