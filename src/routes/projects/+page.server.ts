import { isAdmin } from '#lib/server/auth.js';
import { toIso } from '#lib/server/dates.js';
import { listCurrencies } from '#lib/server/currencies.js';
import {
	listAllProjectMemberIds,
	listMemberCountsByProject,
	setProjectMembers
} from '#lib/server/projectMembers.js';
import {
	createProject,
	deleteProject,
	listProjects,
	updateProject
} from '#lib/server/projects.js';
import { countRepositoriesByProject } from '#lib/server/repositories.js';
import { listUsers } from '#lib/server/users.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const admin = isAdmin(user);

	const [projects, repoCounts, memberCounts, memberIdsByProject, currencies, users] =
		await Promise.all([
			listProjects(user),
			countRepositoriesByProject(),
			listMemberCountsByProject(),
			admin ? listAllProjectMemberIds() : Promise.resolve(new Map<number, number[]>()),
			listCurrencies(true),
			admin ? listUsers() : Promise.resolve([])
		]);

	return {
		pageTitle: 'پروژه‌ها',
		isAdmin: admin,
		currencies: currencies.map((c) => ({
			code: c.code,
			label: `${c.name_fa} (${c.code})`,
			symbol: c.symbol
		})),
		allUsers: users.map((u) => ({
			id: u.id,
			email: u.email,
			displayName: u.display_name || u.email,
			role: u.role
		})),
		projects: projects.map((project) => ({
			id: project.id,
			name: project.name,
			description: project.description,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`,
			repoCount: repoCounts.get(project.id) ?? 0,
			memberCount: memberCounts.get(project.id) ?? 0,
			memberIds: memberIdsByProject.get(project.id) ?? [],
			createdAt: toIso(project.created_at),
			updatedAt: toIso(project.updated_at)
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'create', message: 'فقط ادمین می‌تواند پروژه بسازد.' });
		}

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

	update: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'update', message: 'فقط ادمین می‌تواند پروژه را ویرایش کند.' });
		}

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

	delete: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'delete', message: 'فقط ادمین می‌تواند پروژه را حذف کند.' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));

		const result = await deleteProject(id);
		if (!result.ok) {
			return fail(400, { action: 'delete', id, message: result.message });
		}

		return { action: 'delete', success: true as const, message: 'پروژه حذف شد.' };
	},

	members: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'members', message: 'فقط ادمین می‌تواند اعضا را مدیریت کند.' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		const userIds = form
			.getAll('user_ids')
			.map((value) => Number(value))
			.filter((value) => Number.isInteger(value) && value > 0);

		const result = await setProjectMembers(id, userIds);
		if (!result.ok) {
			return fail(400, { action: 'members', id, message: result.message });
		}

		return {
			action: 'members',
			success: true as const,
			message:
				result.count === 0
					? 'هیچ کاربری به پروژه دسترسی ندارد.'
					: `دسترسی ${result.count} کاربر برای این پروژه ذخیره شد.`
		};
	}
};
