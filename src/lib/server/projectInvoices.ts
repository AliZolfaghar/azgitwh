import { randomUUID } from 'node:crypto';
import { normalizeInvoiceLocale, type InvoiceLocale } from '#lib/invoiceLocale.js';
import { generateProjectReport } from './gitReport.js';
import { getDb } from './db.js';
import { getProjectById } from './projects.js';
import { getProjectReport } from './projectReports.js';

export type { InvoiceLocale } from '#lib/invoiceLocale.js';
export {
	formatPeriodCount,
	getInvoiceCopy,
	invoiceLinesToCsv,
	normalizeInvoiceLocale
} from '#lib/invoiceLocale.js';

export type InvoiceLineSource = 'git' | 'manual';

export type InvoiceLine = {
	id: string;
	row: number;
	email: string;
	date: string;
	period: string;
	repos: string;
	commits: number;
	hours: number;
	payment: number;
	messages: string;
	source: InvoiceLineSource;
};

export type InvoiceSummary = {
	id: number;
	reportId: number | null;
	title: string;
	locale: InvoiceLocale;
	currencyCode: string;
	hourlyRate: number;
	totalHours: number;
	totalPayment: number;
	periodFrom: string;
	periodTo: string;
	createdAt: string;
};

export type InvoiceDetail = InvoiceSummary & {
	lines: InvoiceLine[];
	periods: string[];
	periodMonths: number;
	projectName: string;
	currencyLabel: string;
};

export type ManualInvoiceLineInput = {
	email: string;
	date: string;
	repos?: string;
	commits?: number;
	hours: number;
	messages?: string;
};

function toIso(value: string | Date) {
	return value instanceof Date ? value.toISOString() : String(value);
}

function parseJson<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function countInclusiveMonths(from: string, to: string) {
	const matchFrom = /^(\d{4})-(\d{2})$/.exec(from);
	const matchTo = /^(\d{4})-(\d{2})$/.exec(to);
	if (!matchFrom || !matchTo) return 0;
	const fromIndex = Number(matchFrom[1]) * 12 + Number(matchFrom[2]);
	const toIndex = Number(matchTo[1]) * 12 + Number(matchTo[2]);
	return Math.max(0, toIndex - fromIndex + 1);
}

function periodFromDate(date: string) {
	const match = /^(\d{4}-\d{2})/.exec(date);
	return match?.[1] ?? date.slice(0, 7);
}

function roundMoney(value: number) {
	return Number(value.toFixed(2));
}

function roundHours(value: number) {
	return Number(value.toFixed(2));
}

export function normalizeInvoiceLines(
	lines: Array<Partial<InvoiceLine> & Pick<InvoiceLine, 'email' | 'date' | 'hours'>>,
	hourlyRate: number
): InvoiceLine[] {
	const rate = Math.max(0, Number(hourlyRate) || 0);
	const normalized = lines.map((line) => {
		const hours = roundHours(Math.max(0, Number(line.hours) || 0));
		const date = String(line.date ?? '').trim();
		return {
			id: String(line.id ?? '').trim() || randomUUID(),
			email: String(line.email ?? '').trim(),
			date,
			period: String(line.period ?? '').trim() || periodFromDate(date),
			repos: String(line.repos ?? '').trim(),
			commits: Math.max(0, Math.floor(Number(line.commits) || 0)),
			hours,
			payment: roundMoney(hours * rate),
			messages: String(line.messages ?? '').trim(),
			source: line.source === 'manual' ? ('manual' as const) : ('git' as const)
		};
	});

	normalized.sort((a, b) => {
		const byDate = a.date.localeCompare(b.date);
		if (byDate !== 0) return byDate;
		const byEmail = a.email.localeCompare(b.email);
		if (byEmail !== 0) return byEmail;
		if (a.source !== b.source) return a.source === 'git' ? -1 : 1;
		return a.id.localeCompare(b.id);
	});

	return normalized.map((line, index) => ({
		...line,
		row: index + 1
	}));
}

function totalsFromLines(lines: InvoiceLine[]) {
	return {
		totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)),
		totalPayment: roundMoney(lines.reduce((sum, line) => sum + line.payment, 0))
	};
}

function mapInvoiceSummary(row: {
	id: number;
	report_id: number | null;
	title: string;
	locale?: string;
	currency_code: string;
	hourly_rate: number;
	total_hours: number;
	total_payment: number;
	period_from?: string | null;
	period_to?: string | null;
	created_at: string | Date;
}): InvoiceSummary {
	return {
		id: row.id,
		reportId: row.report_id == null ? null : Number(row.report_id),
		title: row.title,
		locale: normalizeInvoiceLocale(row.locale),
		currencyCode: row.currency_code,
		hourlyRate: Number(row.hourly_rate),
		totalHours: Number(row.total_hours),
		totalPayment: Number(row.total_payment),
		periodFrom: String(row.period_from ?? ''),
		periodTo: String(row.period_to ?? ''),
		createdAt: toIso(row.created_at)
	};
}

export function defaultInvoiceTitle(periods: string[], locale: InvoiceLocale = 'fa') {
	const from = periods[0] ?? '';
	const to = periods.at(-1) ?? from;
	const range = !from ? '' : from === to ? from : `${from} → ${to}`;
	if (normalizeInvoiceLocale(locale) === 'en') {
		return range ? `Invoice · ${range}` : 'Invoice';
	}
	return range ? `فاکتور · ${range}` : 'فاکتور';
}

async function loadInvoiceRow(projectId: number, invoiceId: number) {
	const db = await getDb();
	return db('project_invoices')
		.where({ id: invoiceId, project_id: projectId })
		.first<{
			id: number;
			report_id: number | null;
			title: string;
			locale?: string;
			currency_code: string;
			hourly_rate: number;
			total_hours: number;
			total_payment: number;
			period_from?: string | null;
			period_to?: string | null;
			periods_json?: string | null;
			lines_json: string;
			created_at: string | Date;
		}>();
}

async function persistInvoiceLines(
	projectId: number,
	invoiceId: number,
	hourlyRate: number,
	lines: InvoiceLine[]
) {
	const normalized = normalizeInvoiceLines(lines, hourlyRate);
	const totals = totalsFromLines(normalized);
	const db = await getDb();
	await db('project_invoices')
		.where({ id: invoiceId, project_id: projectId })
		.update({
			lines_json: JSON.stringify(normalized),
			total_hours: totals.totalHours,
			total_payment: totals.totalPayment
		});
	return { lines: normalized, ...totals };
}

export async function createInvoiceFromProject(
	projectId: number,
	input: {
		periods: string[];
		title?: string;
		hourlyRate?: number;
		locale?: InvoiceLocale;
		createdBy?: number | null;
	}
) {
	const project = await getProjectById(projectId);
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	if (!input.periods.length) {
		return { ok: false as const, message: 'بازهٔ ماه‌ها نامعتبر است.' };
	}

	const generated = await generateProjectReport(projectId, input.periods);
	if (!generated.ok) return generated;

	const locale = normalizeInvoiceLocale(input.locale);
	const hourlyRate = Math.max(0, Number(input.hourlyRate ?? 0) || 0);
	const lines = normalizeInvoiceLines(
		generated.report.dailyRows.map((row) => ({
			id: randomUUID(),
			email: row.email,
			date: row.date,
			period: row.period,
			repos: row.repos,
			commits: row.commits,
			hours: row.hours,
			messages: row.messages,
			source: 'git' as const
		})),
		hourlyRate
	);

	if (!lines.length) {
		return { ok: false as const, message: 'ردیف کارکردی برای صدور فاکتور یافت نشد.' };
	}

	const periods = generated.report.periods;
	const periodFrom = periods[0]!;
	const periodTo = periods.at(-1)!;
	const totals = totalsFromLines(lines);
	const title = (input.title ?? '').trim() || defaultInvoiceTitle(periods, locale);

	const db = await getDb();
	const [id] = await db('project_invoices').insert({
		project_id: projectId,
		report_id: null,
		title,
		locale,
		currency_code: project.currency_code,
		hourly_rate: hourlyRate,
		total_hours: totals.totalHours,
		total_payment: totals.totalPayment,
		period_from: periodFrom,
		period_to: periodTo,
		periods_json: JSON.stringify(periods),
		lines_json: JSON.stringify(lines),
		created_by: input.createdBy ?? null,
		created_at: new Date().toISOString()
	});

	return {
		ok: true as const,
		id: Number(id),
		message: locale === 'en' ? `Invoice “${title}” created.` : `فاکتور «${title}» صادر شد.`
	};
}

export async function regenerateInvoice(projectId: number, invoiceId: number) {
	const row = await loadInvoiceRow(projectId, invoiceId);
	if (!row) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}

	let periods = parseJson<string[]>(String(row.periods_json ?? '[]'), []);
	const periodFrom = String(row.period_from ?? '');
	const periodTo = String(row.period_to ?? '');

	if (!periods.length && periodFrom && periodTo) {
		periods = periodFrom === periodTo ? [periodFrom] : [periodFrom, periodTo];
	}

	if (!periods.length && row.report_id) {
		const report = await getProjectReport(projectId, row.report_id);
		if (report?.periods?.length) {
			periods = report.periods;
		}
	}

	if (!periods.length) {
		return { ok: false as const, message: 'بازهٔ زمانی فاکتور مشخص نیست.' };
	}

	const generated = await generateProjectReport(projectId, periods);
	if (!generated.ok) return generated;

	const existing = normalizeInvoiceLines(
		parseJson<Partial<InvoiceLine>[]>(row.lines_json, []).map((line) => ({
			...line,
			email: String(line.email ?? ''),
			date: String(line.date ?? ''),
			hours: Number(line.hours) || 0
		})),
		Number(row.hourly_rate)
	);
	const manualLines = existing.filter((line) => line.source === 'manual');

	const gitLines = generated.report.dailyRows.map((daily) => ({
		id: randomUUID(),
		email: daily.email,
		date: daily.date,
		period: daily.period,
		repos: daily.repos,
		commits: daily.commits,
		hours: daily.hours,
		messages: daily.messages,
		source: 'git' as const
	}));

	if (!gitLines.length && !manualLines.length) {
		return { ok: false as const, message: 'با پارامترهای فعلی ردیف کارکردی یافت نشد.' };
	}

	const nextPeriods = generated.report.periods;
	const nextFrom = nextPeriods[0] ?? periodFrom;
	const nextTo = nextPeriods.at(-1) ?? periodTo;
	const normalized = normalizeInvoiceLines([...gitLines, ...manualLines], Number(row.hourly_rate));
	const totals = totalsFromLines(normalized);

	const db = await getDb();
	await db('project_invoices')
		.where({ id: invoiceId, project_id: projectId })
		.update({
			lines_json: JSON.stringify(normalized),
			total_hours: totals.totalHours,
			total_payment: totals.totalPayment,
			period_from: nextFrom,
			period_to: nextTo,
			periods_json: JSON.stringify(nextPeriods)
		});

	const locale = normalizeInvoiceLocale(row.locale);
	return {
		ok: true as const,
		message:
			locale === 'en'
				? 'Invoice regenerated with current parameters.'
				: 'فاکتور با پارامترهای فعلی دوباره محاسبه شد.'
	};
}

export async function listProjectInvoices(projectId: number): Promise<InvoiceSummary[]> {
	const db = await getDb();
	const rows = await db('project_invoices')
		.where({ project_id: projectId })
		.orderBy('id', 'desc')
		.select(
			'id',
			'report_id',
			'title',
			'locale',
			'currency_code',
			'hourly_rate',
			'total_hours',
			'total_payment',
			'period_from',
			'period_to',
			'created_at'
		);

	return rows.map(mapInvoiceSummary);
}

export async function getProjectInvoice(
	projectId: number,
	invoiceId: number
): Promise<InvoiceDetail | null> {
	const project = await getProjectById(projectId);
	if (!project) return null;

	const row = await loadInvoiceRow(projectId, invoiceId);
	if (!row) return null;

	const rawLines = parseJson<Partial<InvoiceLine>[]>(row.lines_json, []);
	const lines = normalizeInvoiceLines(
		rawLines.map((line) => ({
			...line,
			email: String(line.email ?? ''),
			date: String(line.date ?? ''),
			hours: Number(line.hours) || 0
		})),
		Number(row.hourly_rate)
	);

	const needsPersist = rawLines.some(
		(line) => !String(line.id ?? '').trim() || (line.source !== 'git' && line.source !== 'manual')
	);
	if (needsPersist) {
		await persistInvoiceLines(projectId, invoiceId, Number(row.hourly_rate), lines);
	}

	let periodFrom = String(row.period_from ?? '');
	let periodTo = String(row.period_to ?? '');
	let periods = parseJson<string[]>(String(row.periods_json ?? '[]'), []);

	if ((!periodFrom || !periods.length) && row.report_id) {
		const report = await getProjectReport(projectId, row.report_id);
		if (report) {
			periodFrom = periodFrom || report.periodFrom;
			periodTo = periodTo || report.periodTo;
			periods = periods.length ? periods : report.periods;
		}
	}

	if (!periods.length && periodFrom && periodTo) {
		periods = periodFrom === periodTo ? [periodFrom] : [periodFrom, periodTo];
	}

	const totals = totalsFromLines(lines);
	const periodMonths =
		periods.length > 0 ? periods.length : countInclusiveMonths(periodFrom, periodTo);

	return {
		...mapInvoiceSummary({ ...row, period_from: periodFrom, period_to: periodTo }),
		totalHours: totals.totalHours,
		totalPayment: totals.totalPayment,
		lines,
		periods,
		periodMonths,
		projectName: project.name,
		currencyLabel: `${project.currency_name_fa ?? project.currency_code} (${project.currency_code})`
	};
}

export async function addManualInvoiceLine(
	projectId: number,
	invoiceId: number,
	input: ManualInvoiceLineInput
) {
	const row = await loadInvoiceRow(projectId, invoiceId);
	if (!row) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}

	const email = String(input.email ?? '').trim();
	const date = String(input.date ?? '').trim();
	const hours = Number(input.hours);

	if (!email || !email.includes('@')) {
		return { ok: false as const, message: 'ایمیل معتبر وارد کنید.' };
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return { ok: false as const, message: 'تاریخ باید به صورت YYYY-MM-DD باشد.' };
	}
	if (!Number.isFinite(hours) || hours < 0) {
		return { ok: false as const, message: 'نفرساعت نامعتبر است.' };
	}

	const existing = normalizeInvoiceLines(
		parseJson<Partial<InvoiceLine>[]>(row.lines_json, []).map((line) => ({
			...line,
			email: String(line.email ?? ''),
			date: String(line.date ?? ''),
			hours: Number(line.hours) || 0
		})),
		Number(row.hourly_rate)
	);

	existing.push({
		id: randomUUID(),
		row: 0,
		email,
		date,
		period: periodFromDate(date),
		repos: String(input.repos ?? '').trim(),
		commits: Math.max(0, Math.floor(Number(input.commits) || 0)),
		hours: roundHours(hours),
		payment: 0,
		messages: String(input.messages ?? '').trim(),
		source: 'manual'
	});

	await persistInvoiceLines(projectId, invoiceId, Number(row.hourly_rate), existing);
	return { ok: true as const, message: 'آیتم دستی به فاکتور اضافه شد.' };
}

export async function updateInvoiceLineHours(
	projectId: number,
	invoiceId: number,
	lineId: string,
	hoursInput: number
) {
	const row = await loadInvoiceRow(projectId, invoiceId);
	if (!row) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}

	const hours = Number(hoursInput);
	if (!Number.isFinite(hours) || hours < 0) {
		return { ok: false as const, message: 'نفرساعت نامعتبر است.' };
	}

	const lines = normalizeInvoiceLines(
		parseJson<Partial<InvoiceLine>[]>(row.lines_json, []).map((line) => ({
			...line,
			email: String(line.email ?? ''),
			date: String(line.date ?? ''),
			hours: Number(line.hours) || 0
		})),
		Number(row.hourly_rate)
	);

	const target = lines.find((line) => line.id === lineId);
	if (!target) {
		return { ok: false as const, message: 'ردیف یافت نشد.' };
	}

	target.hours = roundHours(hours);
	await persistInvoiceLines(projectId, invoiceId, Number(row.hourly_rate), lines);
	return { ok: true as const, message: 'نفرساعت ردیف به‌روز شد.' };
}

export async function deleteInvoiceLine(projectId: number, invoiceId: number, lineId: string) {
	const row = await loadInvoiceRow(projectId, invoiceId);
	if (!row) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}

	const lines = normalizeInvoiceLines(
		parseJson<Partial<InvoiceLine>[]>(row.lines_json, []).map((line) => ({
			...line,
			email: String(line.email ?? ''),
			date: String(line.date ?? ''),
			hours: Number(line.hours) || 0
		})),
		Number(row.hourly_rate)
	);

	const target = lines.find((line) => line.id === lineId);
	if (!target) {
		return { ok: false as const, message: 'ردیف یافت نشد.' };
	}
	if (target.source !== 'manual') {
		return { ok: false as const, message: 'فقط ردیف‌های دستی قابل حذف هستند.' };
	}

	const next = lines.filter((line) => line.id !== lineId);
	if (!next.length) {
		return { ok: false as const, message: 'فاکتور نمی‌تواند بدون ردیف بماند.' };
	}

	await persistInvoiceLines(projectId, invoiceId, Number(row.hourly_rate), next);
	return { ok: true as const, message: 'ردیف دستی حذف شد.' };
}

export async function updateInvoiceLocale(
	projectId: number,
	invoiceId: number,
	locale: InvoiceLocale
) {
	const db = await getDb();
	const updated = await db('project_invoices')
		.where({ id: invoiceId, project_id: projectId })
		.update({ locale: normalizeInvoiceLocale(locale) });

	if (!updated) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}

	return { ok: true as const, message: 'زبان فاکتور به‌روز شد.' };
}

export async function deleteProjectInvoice(projectId: number, invoiceId: number) {
	const db = await getDb();
	const deleted = await db('project_invoices')
		.where({ id: invoiceId, project_id: projectId })
		.del();
	if (!deleted) {
		return { ok: false as const, message: 'فاکتور یافت نشد.' };
	}
	return { ok: true as const, message: 'فاکتور حذف شد.' };
}
