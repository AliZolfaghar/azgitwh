/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
	await knex.schema.createTable('mail_settings', (table) => {
		table.increments('id').primary();
		table.string('provider').notNullable().defaultTo('smtp'); // smtp | gmail
		table.boolean('enabled').notNullable().defaultTo(false);
		table.string('host').notNullable().defaultTo('');
		table.integer('port').notNullable().defaultTo(587);
		table.boolean('secure').notNullable().defaultTo(false);
		table.string('username').notNullable().defaultTo('');
		table.text('password').notNullable().defaultTo('');
		table.string('from_email').notNullable().defaultTo('');
		table.string('from_name').notNullable().defaultTo('azgitwh');
		table.timestamps(true, true);
	});

	await knex('mail_settings').insert({
		provider: 'smtp',
		enabled: false,
		host: '',
		port: 587,
		secure: false,
		username: '',
		password: '',
		from_email: '',
		from_name: 'azgitwh'
	});
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('mail_settings');
}
