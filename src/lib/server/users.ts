import { ADMIN_EMAIL, isValidEmail } from './auth.js';
import { nowIso } from './dates.js';
import { getDb } from './db.js';
import { hashPassword } from './password.js';
import { isAdminRole, parseRole, type UserRole } from './roles.js';

export type UserRow = {
	id: number;
	email: string;
	display_name: string;
	role: UserRole;
	created_at: string | Date | number;
	updated_at: string | Date | number;
};

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_NAME_LENGTH = 120;

function normalizeName(name: string) {
	return name.trim().replace(/\s+/g, ' ');
}

function validateName(name: string) {
	const normalized = normalizeName(name);
	if (!normalized) {
		return { ok: false as const, message: 'نام کاربر الزامی است.' };
	}
	if (normalized.length > MAX_NAME_LENGTH) {
		return {
			ok: false as const,
			message: `نام حداکثر ${MAX_NAME_LENGTH} کاراکتر باشد.`
		};
	}
	return { ok: true as const, value: normalized };
}

async function countAdmins(excludeId?: number) {
	const db = await getDb();
	let query = db('users').where({ role: 'admin' }).count({ count: '*' });
	if (excludeId != null) {
		query = query.whereNot({ id: excludeId });
	}
	const row = await query.first<{ count: number | string }>();
	return Number(row?.count ?? 0);
}

export async function listUsers(): Promise<UserRow[]> {
	const db = await getDb();
	const rows = await db('users')
		.select('id', 'email', 'display_name', 'role', 'created_at', 'updated_at')
		.orderBy('id', 'asc');

	return rows.map((row) => ({
		...row,
		role: parseRole(row.role)
	}));
}

export async function createUser(
	email: string,
	password: string,
	displayName: string,
	roleInput: unknown = 'user'
) {
	const normalized = email.trim().toLowerCase();
	const role = parseRole(roleInput, 'user');
	if (!isValidEmail(normalized)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}
	const name = validateName(displayName);
	if (!name.ok) return name;
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
		display_name: name.value,
		role,
		password_hash: hashPassword(password)
	});

	return { ok: true as const, id };
}

export async function updateUser(
	id: number,
	email: string,
	password: string | undefined,
	displayName: string,
	currentUserId: number,
	roleInput: unknown
) {
	const normalized = email.trim().toLowerCase();
	const role = parseRole(roleInput, 'user');
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه کاربر نامعتبر است.' };
	}
	if (!isValidEmail(normalized)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}
	const name = validateName(displayName);
	if (!name.ok) return name;
	if (password && password.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false as const,
			message: `کلمه عبور حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`
		};
	}

	const db = await getDb();
	const user = await db('users')
		.where({ id })
		.first<{ id: number; email: string; role: string }>();
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

	const wasAdmin = isAdminRole(user.role);
	if (wasAdmin && role !== 'admin') {
		const remaining = await countAdmins(id);
		if (remaining < 1) {
			return { ok: false as const, message: 'حداقل یک ادمین باید در سیستم بماند.' };
		}
	}

	const patch: {
		email: string;
		display_name: string;
		role: UserRole;
		password_hash?: string;
		updated_at: string;
	} = {
		email: normalized,
		display_name: name.value,
		role,
		updated_at: nowIso()
	};
	if (password) {
		patch.password_hash = hashPassword(password);
	}

	await db('users').where({ id }).update(patch);

	if (id === currentUserId && normalized !== user.email) {
		await db('sessions').where({ user_id: id }).update({ email: normalized });
	}

	return { ok: true as const, role };
}

export async function deleteUser(id: number, currentUserId: number) {
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه کاربر نامعتبر است.' };
	}
	if (id === currentUserId) {
		return { ok: false as const, message: 'نمی‌توانید حساب خودتان را حذف کنید.' };
	}

	const db = await getDb();
	const user = await db('users').where({ id }).first<{ id: number; email: string; role: string }>();
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

	if (isAdminRole(user.role)) {
		const remaining = await countAdmins(id);
		if (remaining < 1) {
			return { ok: false as const, message: 'حداقل یک ادمین باید در سیستم بماند.' };
		}
	}

	await db('users').where({ id }).del();
	return { ok: true as const };
}

export function canDeleteUser(
	user: { id: number; email: string; role: UserRole },
	currentUserId: number,
	adminCount: number
) {
	if (user.id === currentUserId) return false;
	if (user.email === ADMIN_EMAIL) return false;
	if (isAdminRole(user.role) && adminCount <= 1) return false;
	return true;
}
