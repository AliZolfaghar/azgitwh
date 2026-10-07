import { normalizeInvoiceLocale } from '#lib/invoiceLocale.js';
import {
	defaultPeriodRange,
	isYearMonth,
	periodsFromRange
} from '#lib/server/gitReport.js';
import { createInvoiceFromProject, listProjectInvoices } from '#lib/server/projectInvoices.js';
import { getProjectById } from '#lib/server/projects.js';
import { listProjectRepositories } from '#lib/server/repositories.js';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ params }) => {
	const projectId = parseId(params.id);
	if (!projectId) error(404, 'پروژه یافت نشد');

	const project = await getProjectById(projectId);
	if (!project) error(404, 'پروژه یافت نشد');

	const repositories = await listProjectRepositories(projectId);
	const defaults = defaultPeriodRange();
	const invoices = await listProjectInvoices(projectId);

	return {
		pageTitle: `فاکتورها · ${project.name}`,
		project: {
			id: project.id,
			name: project.name,
			currencyCode: project.currency_code,
			currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`
		},
		enabledCount: repositories.filter((repo) => Boolean(repo.enabled)).length,
		localEnabledCount: repositories.filter(
			(repo) => Boolean(repo.enabled) && repo.kind === 'local'
		).length,
		defaultFrom: defaults.from,
		defaultTo: defaults.to,
		invoices
	};
};

export const actions: Actions = {
	create: async ({ request, params, locals }) => {
		const projectId = parseId(params.id);
		if (!projectId) return fail(404, { message: 'پروژه یافت نشد.' });

		const form = await request.formData();
		const from = String(form.get('from') ?? '').trim();
		const to = String(form.get('to') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const locale = normalizeInvoiceLocale(form.get('locale'));
		const hourlyRateRaw = String(form.get('hourly_rate') ?? '').trim();
		const hourlyRate = hourlyRateRaw === '' ? 0 : Number(hourlyRateRaw);
		const periods = periodsFromRange(from, to);

		const values = {
			from,
			to,
			title,
			locale,
			hourly_rate: hourlyRateRaw
		};

		if (!periods || !isYearMonth(from) || !isYearMonth(to)) {
			return fail(400, {
				action: 'create',
				...values,
				message: 'بازهٔ از / تا باید ماه و سال معتبر باشد (YYYY-MM).'
			});
		}

		if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
			return fail(400, {
				action: 'create',
				...values,
				message: 'نرخ ساعتی نامعتبر است.'
			});
		}

		const result = await createInvoiceFromProject(projectId, {
			periods,
			title: title || undefined,
			hourlyRate,
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
	}
};
