/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('project_report_params', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.unique()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table.float('lines_per_hour_add').notNullable();
		table.float('lines_per_hour_del').notNullable();
		table.float('delete_weight').notNullable();
		table.float('min_work_time').notNullable();
		table.float('max_work_time_single').notNullable();
		table.integer('max_gap_minutes').notNullable();
		table.float('daily_max_hours').notNullable();
		table.boolean('exclude_www').notNullable().defaultTo(true);
		table.timestamps(true, true);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_report_params');
}
