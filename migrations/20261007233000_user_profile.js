/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.alterTable('users', (table) => {
		table.string('display_name').notNullable().defaultTo('');
	});

	await knex('users').where({ email: 'admin@local' }).update({
		display_name: 'مدیر سیستم'
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.alterTable('users', (table) => {
		table.dropColumn('display_name');
	});
}
