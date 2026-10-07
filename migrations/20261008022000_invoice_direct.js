/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.alterTable('project_invoices', (table) => {
		table.string('period_from', 7).nullable();
		table.string('period_to', 7).nullable();
		table.text('periods_json').nullable();
	});

	const invoices = await knex('project_invoices').select('id', 'report_id');
	for (const invoice of invoices) {
		if (!invoice.report_id) continue;
		const report = await knex('project_reports').where({ id: invoice.report_id }).first();
		if (!report) continue;
		await knex('project_invoices')
			.where({ id: invoice.id })
			.update({
				period_from: report.period_from,
				period_to: report.period_to,
				periods_json: report.periods_json
			});
	}

	await knex.schema.alterTable('project_invoices', (table) => {
		table.integer('report_id').unsigned().nullable().alter();
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.alterTable('project_invoices', (table) => {
		table.dropColumn('period_from');
		table.dropColumn('period_to');
		table.dropColumn('periods_json');
	});
}
