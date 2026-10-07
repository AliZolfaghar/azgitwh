import {
	formatPeriodCount,
	getInvoiceCopy,
	normalizeInvoiceLocale,
	sourceLabel,
	type InvoiceLocale
} from '#lib/invoiceLocale.js';
import * as XLSX from 'xlsx';
import type { InvoiceDetail } from './projectInvoices.js';

export function buildInvoiceWorkbook(invoice: InvoiceDetail, localeInput?: InvoiceLocale) {
	const locale = normalizeInvoiceLocale(localeInput ?? invoice.locale);
	const copy = getInvoiceCopy(locale);
	const periodLabel = formatPeriodCount(invoice.periodMonths, locale);
	const periodsText = invoice.periods.length ? invoice.periods.join(' , ') : '';

	const summaryRows: (string | number)[][] = [
		[invoice.title],
		[invoice.projectName],
		[`${copy.ui.currency}: ${invoice.currencyLabel}`],
		[],
		[copy.summary.subtotal, invoice.totalHours, copy.summary.hoursUnit],
		[
			copy.summary.hourly,
			invoice.hourlyRate > 0 ? invoice.hourlyRate : '',
			invoice.currencyCode
		],
		[
			copy.summary.totalPrice,
			invoice.totalPayment > 0 ? invoice.totalPayment : '',
			invoice.currencyCode
		],
		[copy.summary.period, periodLabel, periodsText],
		[],
		[
			copy.table.row,
			copy.table.source,
			copy.table.email,
			copy.table.date,
			copy.table.period,
			copy.table.repos,
			copy.table.commits,
			copy.table.hours,
			copy.table.payment,
			copy.table.messages
		]
	];

	let totalCommits = 0;
	let totalHours = 0;
	let totalPayment = 0;

	for (const line of invoice.lines) {
		totalCommits += line.commits;
		totalHours += line.hours;
		totalPayment += line.payment;
		summaryRows.push([
			line.row,
			sourceLabel(line.source, locale),
			line.email,
			line.date,
			line.period,
			line.repos,
			line.commits || '',
			line.hours,
			line.payment > 0 ? line.payment : '',
			line.messages
		]);
	}

	summaryRows.push([
		copy.table.total,
		'',
		'',
		'',
		'',
		'',
		totalCommits,
		Number(totalHours.toFixed(2)),
		totalPayment > 0 ? Number(totalPayment.toFixed(2)) : '',
		''
	]);

	const sheet = XLSX.utils.aoa_to_sheet(summaryRows);
	sheet['!cols'] = [
		{ wch: 8 },
		{ wch: 10 },
		{ wch: 28 },
		{ wch: 12 },
		{ wch: 10 },
		{ wch: 22 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 40 }
	];

	const workbook = XLSX.utils.book_new();
	const sheetName = locale === 'en' ? 'Invoice' : 'فاکتور';
	XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

	return XLSX.write(workbook, {
		type: 'buffer',
		bookType: 'xlsx'
	}) as Buffer;
}

export function invoiceExcelFilename(projectId: number, invoiceId: number, locale: InvoiceLocale) {
	return `invoice_${projectId}_${invoiceId}_${locale}.xlsx`;
}
