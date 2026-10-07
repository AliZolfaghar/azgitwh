import { getDbInfo } from '#lib/server/db.js';
import { countProjects } from '#lib/server/projects.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const projectCount = await countProjects();
	if (projectCount === 0) {
		redirect(303, '/projects');
	}

	const db = await getDbInfo();

	return {
		pageTitle: 'داشبورد',
		projectCount,
		dbPath: db.path,
		installedAt: db.installedAt,
		runtime: {
			node: process.versions.node,
			platform: process.platform
		}
	};
};
