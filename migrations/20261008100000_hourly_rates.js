/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.alterTable('projects', (table) => {
		table.decimal('hourly_rate', 12, 2).nullable().defaultTo(null);
	});

	await knex.schema.alterTable('project_repositories', (table) => {
		table.decimal('hourly_rate', 12, 2).nullable().defaultTo(null);
	});

	await knex.schema.createTable('project_developer_rates', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table
			.integer('repository_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('project_repositories')
			.onDelete('CASCADE');
		table.string('email').notNullable();
		table.decimal('hourly_rate', 12, 2).notNullable();
		table.timestamps(true, true);
		table.unique(['repository_id', 'email']);
		table.index(['project_id']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_developer_rates');
	await knex.schema.alterTable('project_repositories', (table) => {
		table.dropColumn('hourly_rate');
	});
	await knex.schema.alterTable('projects', (table) => {
		table.dropColumn('hourly_rate');
	});
}
