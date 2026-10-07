import { getProjectById } from '#lib/server/projects.js';
import {
	addRepository,
	deleteRepository,
	listProjectRepositories,
	updateRepository,
	type RepoKind
} from '#lib/server/repositories.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function toIso(value: string | Date) {
	return value instanceof Date ? value.toISOString() : String(value);
}

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function readRepoInput(form: FormData) {
	const kind = String(form.get('kind') ?? 'local');
	return {
		name: String(form.get('name') ?? ''),
		kind: (kind === 'remote' ? 'remote' : 'local') as RepoKind,
		location: String(form.get('location') ?? ''),
		branch: String(form.get('branch') ?? ''),
		enabled: form.get('enabled') === 'on' || form.get('enabled') === 'true'
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const projectId = parseId(params.id);
	if (!projectId) error(404, 'پروژه یافت نشد');

	const project = await getProjectById(projectId);
	if (!project) error(404, 'پروژه یافت نشد');

	const repositories = await listProjectRepositories(projectId);

	return {
		pageTitle: `ریپوها · ${project.name}`,
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`,
			currencySymbol: project.currency_symbol ?? project.currency_code
		},
		repositories: repositories.map((repo) => ({
			id: repo.id,
			name: repo.name,
			kind: repo.kind,
			location: repo.location,
			branch: repo.branch,
			enabled: Boolean(repo.enabled),
			createdAt: toIso(repo.created_at)
		}))
	};
};

export const actions: Actions = {
	add: async ({ request, params }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });

		const form = await request.formData();
		const input = readRepoInput(form);

		const result = await addRepository(projectId, input);
		if (!result.ok) {
			return fail(400, { action: 'add', ...input, message: result.message });
		}
		return { action: 'add', success: true as const, message: 'ریپازیتوری اضافه شد.' };
	},

	update: async ({ request, params }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const input = readRepoInput(form);

		const result = await updateRepository(projectId, repoId, input);
		if (!result.ok) {
			return fail(400, { action: 'update', id: repoId, ...input, message: result.message });
		}
		return { action: 'update', success: true as const, message: 'ریپازیتوری به‌روزرسانی شد.' };
	},

	delete: async ({ request, params }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const result = await deleteRepository(projectId, repoId);
		if (!result.ok) {
			return fail(400, { action: 'delete', id: repoId, message: result.message });
		}
		return { action: 'delete', success: true as const, message: 'ریپازیتوری حذف شد.' };
	}
};
