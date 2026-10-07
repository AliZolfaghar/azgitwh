import { invoiceLinesToCsv, normalizeInvoiceLocale } from '#lib/invoiceLocale.js';
import {
	addManualInvoiceLine,
	deleteInvoiceLine,
	deleteProjectInvoice,
	getProjectInvoice,
	regenerateInvoice,
	updateInvoiceLineHours,
	updateInvoiceLocale
} from '#lib/server/projectInvoices.js';
import {
	assertCanAccessProject,
	assertCanManageProject,
	canManageProject
} from '#lib/server/projectMembers.js';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = parseId(params.id);
	const invoiceId = parseId(params.invoiceId);
	if (!projectId || !invoiceId) error(404, 'یافت نشد');

	await assertCanAccessProject(locals.user, projectId);

	const invoice = await getProjectInvoice(projectId, invoiceId);
	if (!invoice) error(404, 'فاکتور یافت نشد');

	const locale = normalizeInvoiceLocale(invoice.locale);

	return {
		pageTitle: `${invoice.title} · ${invoice.projectName}`,
		canManage: await canManageProject(locals.user, projectId),
		project: {
			id: projectId,
			name: invoice.projectName
		},
		invoice: {
			...invoice,
			locale,
			csv: invoiceLinesToCsv(invoice.lines, locale)
		}
	};
};

export const actions: Actions = {
	setLocale: async ({ params, request, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const locale = normalizeInvoiceLocale(form.get('locale'));
		const result = await updateInvoiceLocale(projectId, invoiceId, locale);
		if (!result.ok) {
			return fail(400, { action: 'setLocale', message: result.message });
		}

		return { action: 'setLocale', success: true, message: result.message };
	},

	addItem: async ({ params, request, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const date = String(form.get('date') ?? '').trim();
		const repos = String(form.get('repos') ?? '').trim();
		const messages = String(form.get('messages') ?? '').trim();
		const commitsRaw = String(form.get('commits') ?? '').trim();
		const hoursRaw = String(form.get('hours') ?? '').trim();
		const commits = commitsRaw === '' ? 0 : Number(commitsRaw);
		const hours = Number(hoursRaw);

		const values = { email, date, repos, messages, commits: commitsRaw, hours: hoursRaw };

		const result = await addManualInvoiceLine(projectId, invoiceId, {
			email,
			date,
			repos,
			messages,
			commits: Number.isFinite(commits) ? commits : 0,
			hours
		});

		if (!result.ok) {
			return fail(400, { action: 'addItem', ...values, message: result.message });
		}

		return { action: 'addItem', success: true, message: result.message };
	},

	updateHours: async ({ params, request, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const lineId = String(form.get('line_id') ?? '').trim();
		const hoursRaw = String(form.get('hours') ?? '').trim();
		const hours = Number(hoursRaw);

		const result = await updateInvoiceLineHours(projectId, invoiceId, lineId, hours);
		if (!result.ok) {
			return fail(400, {
				action: 'updateHours',
				line_id: lineId,
				hours: hoursRaw,
				message: result.message
			});
		}

		return { action: 'updateHours', success: true, message: result.message };
	},

	deleteLine: async ({ params, request, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const form = await request.formData();
		const lineId = String(form.get('line_id') ?? '').trim();
		const result = await deleteInvoiceLine(projectId, invoiceId, lineId);
		if (!result.ok) {
			return fail(400, { action: 'deleteLine', line_id: lineId, message: result.message });
		}

		return { action: 'deleteLine', success: true, message: result.message };
	},

	regenerate: async ({ params, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const result = await regenerateInvoice(projectId, invoiceId);
		if (!result.ok) {
			return fail(400, { action: 'regenerate', message: result.message });
		}

		return { action: 'regenerate', success: true, message: result.message };
	},

	delete: async ({ params, locals }) => {
		const projectId = parseId(params.id);
		const invoiceId = parseId(params.invoiceId);
		if (!projectId || !invoiceId) return fail(404, { message: 'یافت نشد.' });
		await assertCanAccessProject(locals.user, projectId);
		await assertCanManageProject(locals.user, projectId);

		const result = await deleteProjectInvoice(projectId, invoiceId);
		if (!result.ok) {
			return fail(400, { action: 'delete', message: result.message });
		}

		redirect(303, `/projects/${projectId}/invoice`);
	}
};
