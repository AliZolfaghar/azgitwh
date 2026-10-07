import { assertCanAccessProject } from '#lib/server/projectMembers.js';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = parseId(params.id);
	if (!projectId) error(404, 'پروژه یافت نشد');
	await assertCanAccessProject(locals.user, projectId);
	redirect(303, `/projects/${projectId}/invoice`);
};
