/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('project_invoices', (table) => {
		table.increments('id').primary();
		table
			.integer('project_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('projects')
			.onDelete('CASCADE');
		table
			.integer('report_id')
			.unsigned()
			.notNullable()
			.references('id')
			.inTable('project_reports')
			.onDelete('CASCADE');
		table.string('title').notNullable();
		table.string('currency_code', 8).notNullable();
		table.float('hourly_rate').notNullable().defaultTo(0);
		table.float('total_hours').notNullable().defaultTo(0);
		table.float('total_payment').notNullable().defaultTo(0);
		table.text('lines_json').notNullable();
		table
			.integer('created_by')
			.unsigned()
			.nullable()
			.references('id')
			.inTable('users')
			.onDelete('SET NULL');
		table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
		table.index(['project_id', 'created_at']);
		table.index(['report_id']);
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('project_invoices');
}
