/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('project_reports', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table.string('title').notNullable();
		table.string('period_from', 7).notNullable();
		table.string('period_to', 7).notNullable();
		table.text('periods_json').notNullable();
		table.text('totals_json').notNullable();
		table.text('params_json').notNullable();
		table.text('daily_rows_json').notNullable();
		table
			.integer('created_by')
			.unsigned()
			.nullable()
			.references('id')
			.inTable('users')
			.onDelete('SET NULL');
		table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
		table.index(['project_id', 'created_at']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_reports');
}
