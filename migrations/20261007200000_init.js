/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.raw('PRAGMA foreign_keys = ON');

	await knex.schema.createTable('users', (table) => {
		table.increments('id').primary();
		table.string('email').notNullable().unique();
		table.string('password_hash').notNullable();
		table.timestamps(true, true);
	});

	await knex.schema.createTable('sessions', (table) => {
		table.string('id').primary();
		table
			.integer('user_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('users')
			.onDelete('CASCADE');
		table.string('email').notNullable();
		table.timestamp('created_at').notNullable();
		table.timestamp('expires_at').notNullable();
		table.index(['expires_at']);
	});

	await knex.schema.createTable('app_meta', (table) => {
		table.string('key').primary();
		table.text('value').notNullable();
	});

	await knex('app_meta').insert({
		key: 'installed_at',
		value: new Date().toISOString()
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('sessions');
	await knex.schema.dropTableIfExists('users');
	await knex.schema.dropTableIfExists('app_meta');
}
