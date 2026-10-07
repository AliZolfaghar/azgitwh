import { isAdmin, isOperator } from '#lib/server/auth.js';
import { getDbInfo } from '#lib/server/db.js';
import { countProjectsForUser } from '#lib/server/projectMembers.js';
import { ROLE_LABELS } from '#lib/server/roles.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const admin = isAdmin(user);
	const projectCount = await countProjectsForUser(user);

	if (admin && projectCount === 0) {
		redirect(303, '/projects');
	}

	const db = await getDbInfo();

	return {
		pageTitle: 'داشبورد',
		isAdmin: admin,
		isOperator: isOperator(user),
		roleLabel: ROLE_LABELS[user.role],
		projectCount,
		dbPath: db.path,
		installedAt: db.installedAt,
		runtime: {
			node: process.versions.node,
			platform: process.platform
		}
	};
};
