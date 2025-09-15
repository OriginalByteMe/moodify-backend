/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('tracks', table => {
    // Preview URL for song audio clips (optional)
    table.string('previewUrl');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('tracks', table => {
    table.dropColumn('previewUrl');
  });
}

