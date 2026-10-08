import { normalizeInvoiceLocale } from '#lib/invoiceLocale.js';
import {
	defaultPeriodRange,
	isYearMonth,
	periodsFromRange
} from '#lib/server/gitReport.js';
import { createInvoiceFromProject, listProjectInvoices } from '#lib/server/projectInvoices.js';
import {
	assertCanAccessProject,
	assertCanManageProject,
	canManageProject
} from '#lib/server/projectMembers.js';
import { getProjectById } from '#lib/server/projects.js';
import {
	clearProjectReportParams,
	getEffectiveReportParams,
	parseReportParamsForm,
	saveProjectReportParams,
	toPublicParams
} from '#lib/server/reportParams.js';
import { listProjectRepositories } from '#lib/server/repositories.js';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = parseId(params.id);
	if (!projectId) error(404, 'پروژه یافت نشد');

	await assertCanAccessProject(locals.user, projectId);

	const project = await getProjectById(projectId);
	if (!project) error(404, 'پروژه یافت نشد');

	const repositories = await listProjectRepositories(projectId);
	const defaults = defaultPeriodRange();
	const invoices = await listProjectInvoices(projectId);
	const effective = await getEffectiveReportParams(projectId);

	return {
		pageTitle: `فاکتورها · ${project.name}`,
		canManage: await canManageProject(locals.user, projectId),
		project: {
			id: project.id,
			name: project.name,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`,
			hourlyRate: project.hourlyRate
		},
		enabledCount: repositories.filter((repo) => Boolean(repo.enabled)).length,
		localEnabledCount: repositories.filter(
			(repo) => Boolean(repo.enabled) && repo.kind === 'local'
		).length,
		defaultFrom: defaults.from,
		defaultTo: defaults.to,
		reportParams: toPublicParams(effective.params),
		reportParamsSource: effective.source,
		invoices
	};
};

export const actions: Actions = {
	create: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const from = String(form.get('from') ?? '').trim();
		const to = String(form.get('to') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const locale = normalizeInvoiceLocale(form.get('locale'));
		const periods = periodsFromRange(from, to);

		const values = {
			from,
			to,
			title,
			locale
		};

		if (!periods || !isYearMonth(from) || !isYearMonth(to)) {
			return fail(400, {
				action: 'create',
				...values,
				message: 'بازهٔ از / تا باید ماه و سال معتبر باشد (YYYY-MM).'
			});
		}

		const result = await createInvoiceFromProject(projectId, {
			periods,
			title: title || undefined,
			locale,
			createdBy: locals.user?.id ?? null
		});

		if (!result.ok) {
			return fail(400, {
				action: 'create',
				...values,
				message: result.message
			});
		}

		redirect(303, `/projects/${projectId}/invoice/${result.id}`);
	},

	saveProjectParams: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const input = parseReportParamsForm(form);
		const result = await saveProjectReportParams(projectId, input);
		if (!result.ok) {
			return fail(400, {
				action: 'saveProjectParams',
				...input,
				message: result.message
			});
		}

		return {
			action: 'saveProjectParams',
			success: true as const,
			message: result.message
		};
	},

	clearProjectParams: async ({ params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const result = await clearProjectReportParams(projectId);
		return {
			action: 'clearProjectParams',
			success: true as const,
			message: result.message
		};
	}
};
