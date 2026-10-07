import { getUserFromSession } from '#lib/server/auth.js';
import { getDb } from '#lib/server/db.js';
import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';

/** Runs once when the server starts — before the first request. */
export const init: ServerInit = async () => {
	await getDb();
};

export const handle: Handle = async ({ event, resolve }) => {
	const user = await getUserFromSession(event.cookies);
	event.locals.user = user;

	const path = event.url.pathname;
	const isLogin = path === '/login';
	const isLogout = path === '/logout';

	if (!user && !isLogin && !isLogout) {
		const from = path === '/' ? '' : `?from=${encodeURIComponent(path)}`;
		redirect(303, `/login${from}`);
	}

	if (user && isLogin) {
		redirect(303, '/');
	}

	return resolve(event);
};
