/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.alterTable('project_invoices', (table) => {
		table.string('locale', 8).notNullable().defaultTo('fa');
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.alterTable('project_invoices', (table) => {
		table.dropColumn('locale');
	});
}
