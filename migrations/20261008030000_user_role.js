/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.alterTable('users', (table) => {
		table.string('role', 16).notNullable().defaultTo('user');
	});

	// Keep existing accounts usable: everyone already in DB becomes admin once.
	// New users still default to "user".
	await knex('users').update({ role: 'admin' });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.alterTable('users', (table) => {
		table.dropColumn('role');
	});
}
