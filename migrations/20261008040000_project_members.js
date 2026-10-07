/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('project_members', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table
			.integer('user_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('users')
			.onDelete('CASCADE');
		table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
		table.unique(['project_id', 'user_id']);
		table.index(['user_id']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_members');
}
