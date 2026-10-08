import {
	listDeveloperRates,
	setDeveloperRates
} from '#lib/server/hourlyRates.js';
import {
	assertCanAccessProject,
	assertCanManageProject,
	canManageProject
} from '#lib/server/projectMembers.js';
import { getProjectById } from '#lib/server/projects.js';
import {
	addRepository,
	deleteRepository,
	listLocalRepoAuthorEmails,
	listProjectRepositories,
	setRepositoryEnabled,
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
		enabled: form.get('enabled') === 'on' || form.get('enabled') === 'true',
		hourlyRate: String(form.get('hourly_rate') ?? '')
	};
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = parseId(params.id);
	if (!projectId) error(404, 'پروژه یافت نشد');

	await assertCanAccessProject(locals.user, projectId);

	const project = await getProjectById(projectId);
	if (!project) error(404, 'پروژه یافت نشد');

	const repositories = await listProjectRepositories(projectId);
	const repoExtras = await Promise.all(
		repositories.map(async (repo) => {
			const rates = await listDeveloperRates(projectId, repo.id);
			let authorEmails: string[] = [];
			let authorEmailsError: string | null = null;
			if (repo.kind === 'local') {
				const authors = await listLocalRepoAuthorEmails(repo.location, repo.branch);
				authorEmails = authors.emails;
				if (!authors.ok) authorEmailsError = authors.message;
			} else {
				authorEmailsError = 'ریپوی آنلاین فعلاً برای خواندن ایمیل پشتیبانی نمی‌شود.';
			}

			const savedEmails = rates.map((item) => item.email.toLowerCase());
			const emails = [...new Set([...authorEmails, ...savedEmails])].sort((a, b) =>
				a.localeCompare(b)
			);

			return {
				repoId: repo.id,
				developerRates: rates,
				authorEmails: emails,
				authorEmailsError
			};
		})
	);
	const extrasByRepo = Object.fromEntries(repoExtras.map((item) => [item.repoId, item]));

	return {
		pageTitle: `ریپوها · ${project.name}`,
		canManage: await canManageProject(locals.user, projectId),
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`,
			currencySymbol: project.currency_symbol ?? project.currency_code,
			hourlyRate: project.hourlyRate
		},
		repositories: repositories.map((repo) => {
			const extra = extrasByRepo[repo.id];
			return {
				id: repo.id,
				name: repo.name,
				kind: repo.kind,
				location: repo.location,
				branch: repo.branch,
				enabled: Boolean(repo.enabled),
				hourlyRate: repo.hourlyRate,
				developerRates: extra?.developerRates ?? [],
				authorEmails: extra?.authorEmails ?? [],
				authorEmailsError: extra?.authorEmailsError ?? null,
				createdAt: toIso(repo.created_at)
			};
		})
	};
};

export const actions: Actions = {
	add: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const input = readRepoInput(form);

		const result = await addRepository(projectId, input);
		if (!result.ok) {
			return fail(400, { action: 'add', ...input, message: result.message });
		}
		return { action: 'add', success: true as const, message: 'ریپازیتوری اضافه شد.' };
	},

	update: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const input = readRepoInput(form);

		const result = await updateRepository(projectId, repoId, input);
		if (!result.ok) {
			return fail(400, { action: 'update', id: repoId, ...input, message: result.message });
		}
		return { action: 'update', success: true as const, message: 'ریپازیتوری به‌روزرسانی شد.' };
	},

	delete: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const result = await deleteRepository(projectId, repoId);
		if (!result.ok) {
			return fail(400, { action: 'delete', id: repoId, message: result.message });
		}
		return { action: 'delete', success: true as const, message: 'ریپازیتوری حذف شد.' };
	},

	toggleEnabled: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const enabled = form.get('enabled') === 'on' || form.get('enabled') === 'true';
		const result = await setRepositoryEnabled(projectId, repoId, enabled);
		if (!result.ok) {
			return fail(400, { action: 'toggleEnabled', id: repoId, message: result.message });
		}
		return { action: 'toggleEnabled', success: true as const, message: result.message };
	},

	developerRates: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const repoId = Number(form.get('id'));
		const emails = form.getAll('dev_email').map((value) => String(value ?? '').trim());
		const rates = form.getAll('dev_rate').map((value) => String(value ?? '').trim());
		const entries: Array<{ email: string; hourlyRate: number }> = [];

		for (let i = 0; i < Math.max(emails.length, rates.length); i += 1) {
			const email = emails[i] ?? '';
			const rateRaw = rates[i] ?? '';
			if (!email.trim() || !rateRaw.trim()) continue;
			const hourlyRate = Number(rateRaw);
			entries.push({ email, hourlyRate });
		}

		const result = await setDeveloperRates(projectId, repoId, entries);
		if (!result.ok) {
			return fail(400, { action: 'developerRates', id: repoId, message: result.message });
		}

		return {
			action: 'developerRates',
			success: true as const,
			message:
				result.count === 0
					? 'نرخ اختصاصی برنامه‌نویس‌ها پاک شد.'
					: `${result.count} نرخ برنامه‌نویس ذخیره شد.`
		};
	}
};
