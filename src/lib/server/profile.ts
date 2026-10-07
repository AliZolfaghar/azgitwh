import { isValidEmail } from './auth.js';
import { nowIso } from './dates.js';
import { getDb } from './db.js';
import { hashPassword, verifyPassword } from './password.js';
import { MIN_PASSWORD_LENGTH } from './users.js';

export type UserProfile = {
	id: number;
	email: string;
	display_name: string;
	created_at: string | Date | number;
	updated_at: string | Date | number;
};

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
	if (!Number.isInteger(userId) || userId < 1) return null;
	const db = await getDb();
	const row = await db('users')
		.select('id', 'email', 'display_name', 'created_at', 'updated_at')
		.where({ id: userId })
		.first<UserProfile>();
	return row ?? null;
}

export async function updateOwnProfile(
	userId: number,
	input: { email: string; display_name: string }
) {
	const email = input.email.trim().toLowerCase();
	const displayName = input.display_name.trim();

	if (!isValidEmail(email)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}
	if (!displayName) {
		return { ok: false as const, message: 'نام کاربر الزامی است.' };
	}
	if (displayName.length > 120) {
		return { ok: false as const, message: 'نام حداکثر ۱۲۰ کاراکتر باشد.' };
	}

	const db = await getDb();
	const user = await db('users').where({ id: userId }).first<{ id: number; email: string }>();
	if (!user) {
		return { ok: false as const, message: 'کاربر یافت نشد.' };
	}

	const conflict = await db('users').where({ email }).whereNot({ id: userId }).first('id');
	if (conflict) {
		return { ok: false as const, message: 'این ایمیل قبلاً ثبت شده است.' };
	}

	await db('users').where({ id: userId }).update({
		email,
		display_name: displayName,
		updated_at: nowIso()
	});

	if (email !== user.email) {
		await db('sessions').where({ user_id: userId }).update({ email });
	}

	return { ok: true as const, message: 'اطلاعات پروفایل ذخیره شد.', email };
}

export async function changeOwnPassword(
	userId: number,
	input: { currentPassword: string; newPassword: string; confirmPassword: string }
) {
	if (!input.currentPassword) {
		return { ok: false as const, message: 'کلمه عبور فعلی را وارد کنید.' };
	}
	if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false as const,
			message: `کلمه عبور جدید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`
		};
	}
	if (input.newPassword !== input.confirmPassword) {
		return { ok: false as const, message: 'تکرار کلمه عبور جدید مطابقت ندارد.' };
	}
	if (input.newPassword === input.currentPassword) {
		return { ok: false as const, message: 'کلمه عبور جدید باید با قبلی متفاوت باشد.' };
	}

	const db = await getDb();
	const user = await db('users')
		.where({ id: userId })
		.first<{ id: number; password_hash: string }>();
	if (!user) {
		return { ok: false as const, message: 'کاربر یافت نشد.' };
	}

	if (!verifyPassword(input.currentPassword, user.password_hash)) {
		return { ok: false as const, message: 'کلمه عبور فعلی نادرست است.' };
	}

	await db('users').where({ id: userId }).update({
		password_hash: hashPassword(input.newPassword),
		updated_at: nowIso()
	});

	return { ok: true as const, message: 'کلمه عبور با موفقیت تغییر کرد.' };
}
