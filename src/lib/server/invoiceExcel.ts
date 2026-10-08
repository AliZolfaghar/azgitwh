import {
	formatPeriodCount,
	getInvoiceCopy,
	normalizeInvoiceLocale,
	sourceLabel,
	type InvoiceLocale
} from '#lib/invoiceLocale.js';
import ExcelJS from 'exceljs';
import type { InvoiceDetail, InvoiceLine } from './projectInvoices.js';

const COLORS = {
	primary: '1976D2',
	primaryDark: '1565C0',
	headerText: 'FFFFFF',
	summaryFill: 'E3F2FD',
	summaryBorder: '90CAF9',
	totalFill: 'BBDEFB',
	zebra: 'F7FAFC',
	manual: 'FFF8E1',
	edited: 'E8F5E9',
	border: 'CFD8DC',
	muted: '607D8B',
	text: '212121'
};

function thinBorder(color = COLORS.border): Partial<ExcelJS.Borders> {
	const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: `FF${color}` } };
	return { top: edge, left: edge, bottom: edge, right: edge };
}

function styleHeaderCell(cell: ExcelJS.Cell) {
	cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: `FF${COLORS.headerText}` } };
	cell.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: `FF${COLORS.primary}` }
	};
	cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
	cell.border = thinBorder(COLORS.primaryDark);
}

function styleBodyCell(cell: ExcelJS.Cell, opts?: { align?: ExcelJS.Alignment['horizontal'] }) {
	cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${COLORS.text}` } };
	cell.alignment = {
		vertical: 'middle',
		horizontal: opts?.align ?? 'left',
		wrapText: true
	};
	cell.border = thinBorder();
}

function rowFill(line: InvoiceLine, zebra: boolean): string | null {
	if (line.hoursEdited) return COLORS.edited;
	if (line.source === 'manual') return COLORS.manual;
	if (zebra) return COLORS.zebra;
	return null;
}

function applyFill(row: ExcelJS.Row, hex: string | null) {
	if (!hex) return;
	row.eachCell({ includeEmpty: true }, (cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: `FF${hex}` }
		};
	});
}

export async function buildInvoiceWorkbook(
	invoice: InvoiceDetail,
	localeInput?: InvoiceLocale
): Promise<Buffer> {
	const locale = normalizeInvoiceLocale(localeInput ?? invoice.locale);
	const copy = getInvoiceCopy(locale);
	const periodLabel = formatPeriodCount(invoice.periodMonths, locale);
	const periodsText = invoice.periods.length ? invoice.periods.join(' , ') : '—';
	const isFa = locale === 'fa';

	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'git to invoice';
	workbook.created = new Date();
	workbook.modified = new Date();

	const sheet = workbook.addWorksheet(isFa ? 'فاکتور' : 'Invoice', {
		views: [{ state: 'frozen', ySplit: 0, rightToLeft: isFa, showGridLines: false }],
		properties: { defaultRowHeight: 18 }
	});

	sheet.columns = [
		{ key: 'row', width: 6 },
		{ key: 'source', width: 12 },
		{ key: 'email', width: 28 },
		{ key: 'date', width: 12 },
		{ key: 'period', width: 10 },
		{ key: 'repos', width: 22 },
		{ key: 'commits', width: 10 },
		{ key: 'hours', width: 11 },
		{ key: 'rate', width: 10 },
		{ key: 'payment', width: 12 },
		{ key: 'messages', width: 48 }
	];

	// Title
	sheet.mergeCells('A1:K1');
	const titleCell = sheet.getCell('A1');
	titleCell.value = invoice.title;
	titleCell.font = {
		name: 'Calibri',
		size: 16,
		bold: true,
		color: { argb: `FF${COLORS.primaryDark}` }
	};
	titleCell.alignment = { vertical: 'middle', horizontal: isFa ? 'right' : 'left' };
	sheet.getRow(1).height = 28;

	// Meta
	sheet.mergeCells('A2:K2');
	const metaCell = sheet.getCell('A2');
	metaCell.value = [
		invoice.projectName,
		`${copy.ui.currency}: ${invoice.currencyLabel}`,
		`${copy.ui.issuedAt}: ${invoice.createdAt.slice(0, 10)}`
	].join('  ·  ');
	metaCell.font = { name: 'Calibri', size: 10, color: { argb: `FF${COLORS.muted}` } };
	metaCell.alignment = { vertical: 'middle', horizontal: isFa ? 'right' : 'left' };
	sheet.getRow(2).height = 20;

	// Blank spacer
	sheet.getRow(3).height = 8;

	// Summary block (4 rows × 3 cols)
	const summary = [
		[copy.summary.subtotal, invoice.totalHours, copy.summary.hoursUnit],
		[
			copy.summary.hourly,
			invoice.hourlyRate > 0 ? invoice.hourlyRate : '—',
			invoice.currencyCode
		],
		[
			copy.summary.totalPrice,
			invoice.totalPayment > 0 ? invoice.totalPayment : '—',
			invoice.currencyCode
		],
		[copy.summary.period, periodLabel, periodsText]
	] as const;

	summary.forEach((values, index) => {
		const rowNumber = 4 + index;
		const row = sheet.getRow(rowNumber);
		row.height = 22;
		values.forEach((value, colIndex) => {
			const cell = row.getCell(colIndex + 1);
			cell.value = value;
			cell.border = thinBorder(COLORS.summaryBorder);
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: `FF${COLORS.summaryFill}` }
			};
			if (colIndex === 0) {
				cell.font = {
					name: 'Calibri',
					size: 10,
					bold: true,
					color: { argb: `FF${COLORS.primaryDark}` }
				};
				cell.alignment = { vertical: 'middle', horizontal: isFa ? 'right' : 'left' };
			} else if (colIndex === 1) {
				cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: `FF${COLORS.text}` } };
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
				if (typeof value === 'number') {
					cell.numFmt = index === 2 ? '#,##0.000' : '#,##0.##';
				}
			} else {
				cell.font = { name: 'Calibri', size: 9, color: { argb: `FF${COLORS.muted}` } };
				cell.alignment = { vertical: 'middle', horizontal: isFa ? 'right' : 'left', wrapText: true };
			}
		});
	});

	sheet.mergeCells('C7:K7');

	// Section title
	sheet.mergeCells('A9:K9');
	const sectionCell = sheet.getCell('A9');
	sectionCell.value = copy.ui.detailsTitle;
	sectionCell.font = {
		name: 'Calibri',
		size: 12,
		bold: true,
		color: { argb: `FF${COLORS.primaryDark}` }
	};
	sectionCell.alignment = { vertical: 'middle', horizontal: isFa ? 'right' : 'left' };
	sheet.getRow(9).height = 22;

	// Table header
	const headerRowNumber = 10;
	const headers = [
		copy.table.row,
		copy.table.source,
		copy.table.email,
		copy.table.date,
		copy.table.period,
		copy.table.repos,
		copy.table.commits,
		copy.table.hours,
		copy.table.rate,
		copy.table.payment,
		copy.table.messages
	];
	const headerRow = sheet.getRow(headerRowNumber);
	headerRow.height = 24;
	headers.forEach((label, index) => {
		const cell = headerRow.getCell(index + 1);
		cell.value = label;
		styleHeaderCell(cell);
	});

	sheet.views = [
		{
			state: 'frozen',
			ySplit: headerRowNumber,
			rightToLeft: isFa,
			showGridLines: false
		}
	];

	let totalCommits = 0;
	let totalHours = 0;
	let totalPayment = 0;

	invoice.lines.forEach((line, index) => {
		totalCommits += line.commits;
		totalHours += line.hours;
		totalPayment += line.payment;

		const rowNumber = headerRowNumber + 1 + index;
		const row = sheet.getRow(rowNumber);
		row.height = Math.min(60, Math.max(20, Math.ceil(line.messages.length / 48) * 14));

		const values: (string | number)[] = [
			line.row,
			line.hoursEdited
				? copy.ui.editedBadge
				: sourceLabel(line.source, locale),
			line.email,
			line.date,
			line.period,
			line.repos || '—',
			line.commits || '',
			line.hours,
			line.rate > 0 ? line.rate : '',
			line.payment > 0 ? line.payment : '',
			line.messages || '—'
		];

		values.forEach((value, colIndex) => {
			const cell = row.getCell(colIndex + 1);
			cell.value = value;
			const centerCols = new Set([0, 1, 3, 4, 6, 7, 8, 9]);
			styleBodyCell(cell, {
				align: centerCols.has(colIndex) ? 'center' : isFa ? 'right' : 'left'
			});
			if (colIndex === 7 || colIndex === 8 || colIndex === 9) {
				if (typeof value === 'number') cell.numFmt = '#,##0.##';
			}
			if (colIndex === 2 || colIndex === 3 || colIndex === 4) {
				cell.alignment = { ...cell.alignment, horizontal: 'center' };
			}
		});

		applyFill(row, rowFill(line, index % 2 === 1));
	});

	const totalRowNumber = headerRowNumber + 1 + invoice.lines.length;
	const totalRow = sheet.getRow(totalRowNumber);
	totalRow.height = 24;
	const totalValues: (string | number)[] = [
		copy.table.total,
		'',
		'',
		'',
		'',
		'',
		totalCommits,
		Number(totalHours.toFixed(2)),
		'',
		totalPayment > 0 ? Number(totalPayment.toFixed(2)) : '',
		''
	];
	totalValues.forEach((value, colIndex) => {
		const cell = totalRow.getCell(colIndex + 1);
		cell.value = value;
		cell.font = {
			name: 'Calibri',
			size: 10,
			bold: true,
			color: { argb: `FF${COLORS.primaryDark}` }
		};
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: `FF${COLORS.totalFill}` }
		};
		cell.border = thinBorder(COLORS.primary);
		cell.alignment = {
			vertical: 'middle',
			horizontal: colIndex === 0 ? (isFa ? 'right' : 'left') : 'center'
		};
		if ((colIndex === 7 || colIndex === 9) && typeof value === 'number') {
			cell.numFmt = '#,##0.##';
		}
	});
	sheet.mergeCells(`A${totalRowNumber}:F${totalRowNumber}`);

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

export function invoiceExcelFilename(projectId: number, invoiceId: number, locale: InvoiceLocale) {
	return `invoice_${projectId}_${invoiceId}_${locale}.xlsx`;
}
