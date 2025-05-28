/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.createTable('records', table => {
        table.increments('id').primary();
        table.string('spotifyId').notNullable();
        table.string('title').notNullable();
        table.string('artists').notNullable();
        table.string('album').notNullable();
        table.string('albumCover').notNullable();
        table.string('songUrl').notNullable();
        table.jsonb('colourPalette').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.dropTable('records');
};
