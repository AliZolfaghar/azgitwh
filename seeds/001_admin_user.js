import { randomBytes, scryptSync } from 'node:crypto';

const ADMIN_EMAIL = 'admin@local';
const ADMIN_PASSWORD = 'admin@1234';

function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

/**
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
	const existing = await knex('users').where({ email: ADMIN_EMAIL }).first();
	if (existing) return;

	await knex('users').insert({
		email: ADMIN_EMAIL,
		display_name: 'مدیر سیستم',
		password_hash: hashPassword(ADMIN_PASSWORD)
	});
}
