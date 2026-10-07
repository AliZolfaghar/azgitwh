import { ADMIN_EMAIL, isValidEmail } from './auth.js';
import { getDb } from './db.js';
import { hashPassword } from './password.js';

export type UserRow = {
	id: number;
	email: string;
	display_name: string;
	created_at: string | Date;
	updated_at: string | Date;
};

export const MIN_PASSWORD_LENGTH = 6;

export async function listUsers(): Promise<UserRow[]> {
	const db = await getDb();
	return db('users')
		.select('id', 'email', 'display_name', 'created_at', 'updated_at')
		.orderBy('id', 'asc');
}

export async function createUser(email: string, password: string, displayName = '') {
	const normalized = email.trim().toLowerCase();
	if (!isValidEmail(normalized)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false as const,
			message: `کلمه عبور حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`
		};
	}

	const db = await getDb();
	const exists = await db('users').where({ email: normalized }).first('id');
	if (exists) {
		return { ok: false as const, message: 'این ایمیل قبلاً ثبت شده است.' };
	}

	const [id] = await db('users').insert({
		email: normalized,
		display_name: displayName.trim(),
		password_hash: hashPassword(password)
	});

	return { ok: true as const, id };
}

export async function updateUser(
	id: number,
	email: string,
	password: string | undefined,
	currentUserId: number
) {
	const normalized = email.trim().toLowerCase();
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه کاربر نامعتبر است.' };
	}
	if (!isValidEmail(normalized)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}
	if (password && password.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false as const,
			message: `کلمه عبور حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`
		};
	}

	const db = await getDb();
	const user = await db('users').where({ id }).first<{ id: number; email: string }>();
	if (!user) {
		return { ok: false as const, message: 'کاربر یافت نشد.' };
	}

	const conflict = await db('users')
		.where({ email: normalized })
		.whereNot({ id })
		.first('id');
	if (conflict) {
		return { ok: false as const, message: 'این ایمیل قبلاً ثبت شده است.' };
	}

	const patch: { email: string; password_hash?: string; updated_at: Date } = {
		email: normalized,
		updated_at: new Date()
	};
	if (password) {
		patch.password_hash = hashPassword(password);
	}

	await db('users').where({ id }).update(patch);

	if (id === currentUserId && normalized !== user.email) {
		await db('sessions').where({ user_id: id }).update({ email: normalized });
	}

	return { ok: true as const };
}

export async function deleteUser(id: number, currentUserId: number) {
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه کاربر نامعتبر است.' };
	}
	if (id === currentUserId) {
		return { ok: false as const, message: 'نمی‌توانید حساب خودتان را حذف کنید.' };
	}

	const db = await getDb();
	const user = await db('users').where({ id }).first<{ id: number; email: string }>();
	if (!user) {
		return { ok: false as const, message: 'کاربر یافت نشد.' };
	}

	const countRow = await db('users').count({ count: '*' }).first<{ count: number | string }>();
	if (Number(countRow?.count ?? 0) <= 1) {
		return { ok: false as const, message: 'حداقل یک کاربر باید در سیستم بماند.' };
	}

	if (user.email === ADMIN_EMAIL) {
		return { ok: false as const, message: 'کاربر اولیه admin را نمی‌توان حذف کرد.' };
	}

	await db('users').where({ id }).del();
	return { ok: true as const };
}
