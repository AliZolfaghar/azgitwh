import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db.js';
import { verifyPassword } from './password.js';

export const SESSION_COOKIE = 'azgitwh_session';
export const ADMIN_EMAIL = 'admin@local';
export const ADMIN_PASSWORD = 'admin@1234';

const SESSION_DAYS = 7;

export type AuthUser = {
	id: number;
	email: string;
	displayName: string;
};

function sessionExpiryIso() {
	const expires = new Date();
	expires.setDate(expires.getDate() + SESSION_DAYS);
	return expires.toISOString();
}

/** Accepts addresses like `admin@local` (no TLD required). */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+$/.test(email);
}

export async function verifyCredentials(
	email: string,
	password: string
): Promise<AuthUser | null> {
	if (!isValidEmail(email)) return null;

	const db = await getDb();
	const user = await db('users')
		.where({ email: email.trim().toLowerCase() })
		.first<{ id: number; email: string; display_name: string; password_hash: string }>();

	if (!user) return null;
	if (!verifyPassword(password, user.password_hash)) return null;

	return { id: user.id, email: user.email, displayName: user.display_name || '' };
}

export async function createSession(user: AuthUser, cookies: Cookies) {
	const db = await getDb();
	const id = randomBytes(32).toString('hex');
	const now = new Date().toISOString();
	const expiresAt = sessionExpiryIso();

	await db('sessions').insert({
		id,
		user_id: user.id,
		email: user.email,
		created_at: now,
		expires_at: expiresAt
	});

	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_DAYS * 24 * 60 * 60
	});
}

export async function destroySession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) {
		const db = await getDb();
		await db('sessions').where({ id }).del();
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getUserFromSession(cookies: Cookies): Promise<AuthUser | null> {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;

	const db = await getDb();
	const row = await db('sessions')
		.join('users', 'users.id', 'sessions.user_id')
		.select(
			'sessions.user_id',
			'sessions.email',
			'sessions.expires_at',
			'users.display_name'
		)
		.where('sessions.id', id)
		.first<{
			user_id: number;
			email: string;
			display_name: string;
			expires_at: string;
		}>();

	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	if (new Date(row.expires_at).getTime() <= Date.now()) {
		await db('sessions').where({ id }).del();
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return {
		id: row.user_id,
		email: row.email,
		displayName: row.display_name || ''
	};
}
