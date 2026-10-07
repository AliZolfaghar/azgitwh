/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('projects', (table) => {
		table.increments('id').primary();
		table.string('name').notNullable();
		table.text('description').notNullable().defaultTo('');
		table
			.integer('created_by')
			.unsigned()
			.nullable()
			.references('id')
			.inTable('users')
			.onDelete('SET NULL');
		table.timestamps(true, true);
		table.unique(['name']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('projects');
}
