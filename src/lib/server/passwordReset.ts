import { createHash, randomBytes } from 'node:crypto';
import { isValidEmail } from './auth.js';
import { getDb } from './db.js';
import { sendAppMail } from './mail.js';
import { buildPasswordResetMail } from './mailTemplate.js';
import { hashPassword } from './password.js';
import { MIN_PASSWORD_LENGTH } from './users.js';

const TOKEN_BYTES = 32;
export const RESET_TOKEN_TTL_MINUTES = 60;

function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

function expiryDate() {
	const expires = new Date();
	expires.setMinutes(expires.getMinutes() + RESET_TOKEN_TTL_MINUTES);
	return expires;
}

/** Always returns a generic success-shaped message to avoid email enumeration. */
export async function requestPasswordReset(emailRaw: string, origin: string) {
	const email = emailRaw.trim().toLowerCase();
	if (!isValidEmail(email)) {
		return { ok: false as const, message: 'ایمیل معتبر نیست.' };
	}

	const db = await getDb();
	const user = await db('users').where({ email }).first<{ id: number; email: string }>();

	// Same response whether or not the user exists.
	const genericOk = {
		ok: true as const,
		message:
			'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی به‌زودی ارسال می‌شود. صندوق ورودی و اسپم را بررسی کنید.'
	};

	if (!user) return genericOk;

	const token = randomBytes(TOKEN_BYTES).toString('hex');
	const tokenHash = hashToken(token);
	const expiresAt = expiryDate();

	await db('password_reset_tokens').where({ user_id: user.id }).whereNull('used_at').del();
	await db('password_reset_tokens').insert({
		user_id: user.id,
		token_hash: tokenHash,
		expires_at: expiresAt.toISOString(),
		created_at: new Date().toISOString()
	});

	const resetUrl = `${origin.replace(/\/$/, '')}/login/reset?token=${encodeURIComponent(token)}`;
	const mail = buildPasswordResetMail({
		to: user.email,
		resetUrl,
		expiresMinutes: RESET_TOKEN_TTL_MINUTES
	});

	const sent = await sendAppMail(user.email, mail);
	if (!sent.ok) {
		await db('password_reset_tokens').where({ token_hash: tokenHash }).del();
		return { ok: false as const, message: sent.message };
	}

	return genericOk;
}

export async function getResetTokenStatus(tokenRaw: string) {
	const token = tokenRaw.trim();
	if (!token || token.length < 32) {
		return { ok: false as const, message: 'لینک بازیابی نامعتبر است.' };
	}

	const db = await getDb();
	const row = await db('password_reset_tokens')
		.where({ token_hash: hashToken(token) })
		.first<{
			id: number;
			user_id: number;
			expires_at: string | Date;
			used_at: string | Date | null;
		}>();

	if (!row) {
		return { ok: false as const, message: 'لینک بازیابی نامعتبر یا منقضی شده است.' };
	}
	if (row.used_at) {
		return { ok: false as const, message: 'این لینک قبلاً استفاده شده است.' };
	}
	if (new Date(row.expires_at).getTime() <= Date.now()) {
		return { ok: false as const, message: 'لینک بازیابی منقضی شده است. دوباره درخواست دهید.' };
	}

	return { ok: true as const, tokenId: row.id, userId: row.user_id };
}

export async function resetPasswordWithToken(
	tokenRaw: string,
	newPassword: string,
	confirmPassword: string
) {
	const status = await getResetTokenStatus(tokenRaw);
	if (!status.ok) return status;

	if (newPassword.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false as const,
			message: `کلمه عبور جدید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`
		};
	}
	if (newPassword !== confirmPassword) {
		return { ok: false as const, message: 'تکرار کلمه عبور مطابقت ندارد.' };
	}

	const db = await getDb();
	await db.transaction(async (trx) => {
		await trx('users').where({ id: status.userId }).update({
			password_hash: hashPassword(newPassword),
			updated_at: new Date()
		});
		await trx('password_reset_tokens').where({ id: status.tokenId }).update({
			used_at: new Date().toISOString()
		});
		// End other sessions so the new password is required everywhere.
		await trx('sessions').where({ user_id: status.userId }).del();
	});

	return {
		ok: true as const,
		message: 'کلمه عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.'
	};
}
