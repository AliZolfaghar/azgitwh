/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('report_params', (table) => {
		table.increments('id').primary();
		table.float('lines_per_hour_add').notNullable().defaultTo(65);
		table.float('lines_per_hour_del').notNullable().defaultTo(110);
		table.float('delete_weight').notNullable().defaultTo(0.65);
		table.float('min_work_time').notNullable().defaultTo(0.25);
		table.float('max_work_time_single').notNullable().defaultTo(5);
		table.integer('max_gap_minutes').notNullable().defaultTo(90);
		table.float('daily_max_hours').notNullable().defaultTo(8);
		table.boolean('exclude_www').notNullable().defaultTo(true);
		table.timestamps(true, true);
	});

	await knex('report_params').insert({
		lines_per_hour_add: 65,
		lines_per_hour_del: 110,
		delete_weight: 0.65,
		min_work_time: 0.25,
		max_work_time_single: 5,
		max_gap_minutes: 90,
		daily_max_hours: 8,
		exclude_www: true
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('report_params');
}
