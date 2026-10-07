/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('currencies', (table) => {
		table.string('code', 8).primary();
		table.string('name').notNullable();
		table.string('name_fa').notNullable();
		table.string('symbol').notNullable().defaultTo('');
		table.integer('decimals').notNullable().defaultTo(2);
		table.boolean('enabled').notNullable().defaultTo(true);
		table.integer('sort_order').notNullable().defaultTo(0);
	});

	await knex('currencies').insert([
		{ code: 'USD', name: 'US Dollar', name_fa: 'دلار آمریکا', symbol: '$', decimals: 2, enabled: true, sort_order: 10 },
		{ code: 'CAD', name: 'Canadian Dollar', name_fa: 'دلار کانادا', symbol: 'C$', decimals: 2, enabled: true, sort_order: 20 },
		{ code: 'EUR', name: 'Euro', name_fa: 'یورو', symbol: '€', decimals: 2, enabled: true, sort_order: 30 },
		{ code: 'GBP', name: 'British Pound', name_fa: 'پوند انگلیس', symbol: '£', decimals: 2, enabled: true, sort_order: 40 },
		{ code: 'AUD', name: 'Australian Dollar', name_fa: 'دلار استرالیا', symbol: 'A$', decimals: 2, enabled: true, sort_order: 50 },
		{ code: 'CHF', name: 'Swiss Franc', name_fa: 'فرانک سوئیس', symbol: 'CHF', decimals: 2, enabled: true, sort_order: 60 },
		{ code: 'AED', name: 'UAE Dirham', name_fa: 'درهم امارات', symbol: 'د.إ', decimals: 2, enabled: true, sort_order: 70 },
		{ code: 'TRY', name: 'Turkish Lira', name_fa: 'لیر ترکیه', symbol: '₺', decimals: 2, enabled: true, sort_order: 80 },
		{ code: 'IRT', name: 'Iranian Toman', name_fa: 'تومان', symbol: 'تومان', decimals: 0, enabled: true, sort_order: 90 },
		{ code: 'IRR', name: 'Iranian Rial', name_fa: 'ریال', symbol: 'ریال', decimals: 0, enabled: true, sort_order: 100 }
	]);

	await knex.schema.alterTable('projects', (table) => {
		table
			.string('currency_code', 8)
			.notNullable()
			.defaultTo('USD')
			.references('code')
			.inTable('currencies');
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.alterTable('projects', (table) => {
		table.dropColumn('currency_code');
	});
	await knex.schema.dropTableIfExists('currencies');
}
