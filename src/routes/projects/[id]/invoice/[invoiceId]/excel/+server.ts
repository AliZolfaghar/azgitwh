import { normalizeInvoiceLocale } from '#lib/invoiceLocale.js';
import { buildInvoiceWorkbook, invoiceExcelFilename } from '#lib/server/invoiceExcel.js';
import { getProjectInvoice } from '#lib/server/projectInvoices.js';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const projectId = parseId(params.id);
	const invoiceId = parseId(params.invoiceId);
	if (!projectId || !invoiceId) error(404, 'یافت نشد');

	const invoice = await getProjectInvoice(projectId, invoiceId);
	if (!invoice) error(404, 'فاکتور یافت نشد');

	const locale = normalizeInvoiceLocale(url.searchParams.get('locale') ?? invoice.locale);
	const buffer = buildInvoiceWorkbook(invoice, locale);
	const filename = invoiceExcelFilename(projectId, invoiceId, locale);
	const body = new Uint8Array(buffer);

	return new Response(body, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store'
		}
	});
};
