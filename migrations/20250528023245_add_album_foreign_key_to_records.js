/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.table('tracks', table => {
    table.integer('album_id').unsigned();
    table.foreign('album_id').references('id').inTable('albums');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.table('tracks', table => {
    table.dropForeign('album_id');
    table.dropColumn('album_id');
  });
};
