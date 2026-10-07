import { getUserFromSession, isAdmin } from '#lib/server/auth.js';
import { getDb } from '#lib/server/db.js';
import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';

/** Runs once when the server starts — before the first request. */
export const init: ServerInit = async () => {
	await getDb();
};

function isPublicPath(path: string) {
	return path === '/logout' || path === '/login' || path.startsWith('/login/');
}

/** Paths a normal (non-admin) user may open. */
function isNormalUserPath(path: string) {
	return (
		path === '/' ||
		path === '/profile' ||
		path.startsWith('/profile/') ||
		path === '/projects' ||
		path.startsWith('/projects/') ||
		path === '/logout'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const user = await getUserFromSession(event.cookies);
	event.locals.user = user;

	const path = event.url.pathname;

	if (!user && !isPublicPath(path)) {
		const from = path === '/' ? '' : `?from=${encodeURIComponent(path)}`;
		redirect(303, `/login${from}`);
	}

	if (user && (path === '/login' || path.startsWith('/login/'))) {
		redirect(303, '/');
	}

	if (user && !isAdmin(user) && !isNormalUserPath(path)) {
		redirect(303, '/');
	}

	return resolve(event);
};
