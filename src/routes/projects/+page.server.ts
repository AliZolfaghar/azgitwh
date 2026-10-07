import { listCurrencies } from '#lib/server/currencies.js';
import {
	createProject,
	deleteProject,
	listProjects,
	updateProject
} from '#lib/server/projects.js';
import { countRepositoriesByProject } from '#lib/server/repositories.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function toIso(value: string | Date) {
	return value instanceof Date ? value.toISOString() : String(value);
}

export const load: PageServerLoad = async () => {
	const [projects, repoCounts, currencies] = await Promise.all([
		listProjects(),
		countRepositoriesByProject(),
		listCurrencies(true)
	]);

	return {
		pageTitle: 'پروژه‌ها',
		currencies: currencies.map((c) => ({
			code: c.code,
			label: `${c.name_fa} (${c.code})`,
			symbol: c.symbol
		})),
		projects: projects.map((project) => ({
			id: project.id,
			name: project.name,
			description: project.description,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`,
			repoCount: repoCounts.get(project.id) ?? 0,
			createdAt: toIso(project.created_at),
			updatedAt: toIso(project.updated_at)
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		const description = String(form.get('description') ?? '');
		const currencyCode = String(form.get('currency_code') ?? 'USD');

		const result = await createProject(
			name,
			description,
			currencyCode,
			locals.user?.id ?? null
		);
		if (!result.ok) {
			return fail(400, {
				action: 'create',
				name,
				description,
				currency_code: currencyCode,
				message: result.message
			});
		}

		return { action: 'create', success: true as const, message: 'پروژه ساخته شد.' };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '');
		const description = String(form.get('description') ?? '');
		const currencyCode = String(form.get('currency_code') ?? 'USD');

		const result = await updateProject(id, name, description, currencyCode);
		if (!result.ok) {
			return fail(400, {
				action: 'update',
				id,
				name,
				description,
				currency_code: currencyCode,
				message: result.message
			});
		}

		return { action: 'update', success: true as const, message: 'پروژه به‌روزرسانی شد.' };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));

		const result = await deleteProject(id);
		if (!result.ok) {
			return fail(400, { action: 'delete', id, message: result.message });
		}

		return { action: 'delete', success: true as const, message: 'پروژه حذف شد.' };
	}
};
