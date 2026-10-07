/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('project_repositories', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table.string('name').notNullable();
		table.string('kind').notNullable(); // local | remote
		table.text('location').notNullable(); // filesystem path or git URL
		table.string('branch').notNullable().defaultTo('');
		table.boolean('enabled').notNullable().defaultTo(true);
		table.timestamps(true, true);
		table.unique(['project_id', 'location']);
		table.index(['project_id']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_repositories');
}
