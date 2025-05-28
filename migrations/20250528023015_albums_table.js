/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('albums', table => {
    table.increments('id').primary();
    table.string('albumCover').notNullable();
    table.string('album').notNullable();
    table.string('artists').notNullable();
    table.string('spotifyId').notNullable();
    table.jsonb('colourPalette').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('albums');
};
