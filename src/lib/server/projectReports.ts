import {
	dailyRowsToCsv,
	generateProjectReport,
	type DailyReportRow,
	type ProjectReportResult
} from './gitReport.js';
import { getDb } from './db.js';
import { getProjectById } from './projects.js';

export type SavedReportRow = {
	id: number;
	project_id: number;
	title: string;
	period_from: string;
	period_to: string;
	periods_json: string;
	totals_json: string;
	params_json: string;
	daily_rows_json: string;
	created_by: number | null;
	created_at: string | Date;
};

export type SavedReportSummary = {
	id: number;
	title: string;
	periodFrom: string;
	periodTo: string;
	personDays: number;
	hoursCapped: number;
	createdAt: string;
};

export type SavedReportDetail = SavedReportSummary & {
	periods: string[];
	dailyRows: DailyReportRow[];
	totals: ProjectReportResult['totals'];
	params: ProjectReportResult['params'];
	csv: string;
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

export function defaultReportTitle(from: string, to: string) {
	return from === to ? `گزارش ${from}` : `گزارش ${from} تا ${to}`;
}

export async function listProjectReports(projectId: number): Promise<SavedReportSummary[]> {
	const db = await getDb();
	const rows = await db('project_reports')
		.where({ project_id: projectId })
		.orderBy('id', 'desc')
		.select('id', 'title', 'period_from', 'period_to', 'totals_json', 'created_at');

	return rows.map((row) => {
		const totals = parseJson(String(row.totals_json), {
			personDays: 0,
			hoursCapped: 0
		});
		return {
			id: row.id,
			title: row.title,
			periodFrom: row.period_from,
			periodTo: row.period_to,
			personDays: Number(totals.personDays ?? 0),
			hoursCapped: Number(totals.hoursCapped ?? 0),
			createdAt: toIso(row.created_at)
		};
	});
}

export async function getProjectReport(
	projectId: number,
	reportId: number
): Promise<SavedReportDetail | null> {
	const db = await getDb();
	const row = await db('project_reports')
		.where({ id: reportId, project_id: projectId })
		.first<SavedReportRow>();
	if (!row) return null;

	const dailyRows = parseJson<DailyReportRow[]>(row.daily_rows_json, []);
	const totals = parseJson<ProjectReportResult['totals']>(row.totals_json, {
		personDays: 0,
		hoursCapped: 0,
		hoursRaw: 0,
		cappedDays: 0,
		reposUsed: 0,
		reposSkipped: []
	});
	const params = parseJson<ProjectReportResult['params']>(row.params_json, {
		linesPerHourAdd: 65,
		linesPerHourDel: 110,
		deleteWeight: 0.65,
		minWorkTime: 0.25,
		maxWorkTimeSingle: 5,
		maxGapMinutes: 90,
		dailyMaxHours: 8,
		excludeWww: true
	});
	const periods = parseJson<string[]>(row.periods_json, [row.period_from, row.period_to]);

	return {
		id: row.id,
		title: row.title,
		periodFrom: row.period_from,
		periodTo: row.period_to,
		personDays: totals.personDays,
		hoursCapped: totals.hoursCapped,
		createdAt: toIso(row.created_at),
		periods,
		dailyRows,
		totals,
		params,
		csv: dailyRowsToCsv(dailyRows)
	};
}

export async function createProjectReport(
	projectId: number,
	input: { periods: string[]; title?: string; createdBy?: number | null }
) {
	const project = await getProjectById(projectId);
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	const generated = await generateProjectReport(projectId, input.periods);
	if (!generated.ok) return generated;

	const { report } = generated;
	const periodFrom = report.periods[0]!;
	const periodTo = report.periods.at(-1)!;
	const title = (input.title ?? '').trim() || defaultReportTitle(periodFrom, periodTo);

	const db = await getDb();
	const [id] = await db('project_reports').insert({
		project_id: projectId,
		title,
		period_from: periodFrom,
		period_to: periodTo,
		periods_json: JSON.stringify(report.periods),
		totals_json: JSON.stringify(report.totals),
		params_json: JSON.stringify(report.params),
		daily_rows_json: JSON.stringify(report.dailyRows),
		created_by: input.createdBy ?? null,
		created_at: new Date().toISOString()
	});

	return {
		ok: true as const,
		id: Number(id),
		message: `گزارش «${title}» ذخیره شد.`,
		title
	};
}

export async function deleteProjectReport(projectId: number, reportId: number) {
	const db = await getDb();
	const deleted = await db('project_reports')
		.where({ id: reportId, project_id: projectId })
		.del();
	if (!deleted) {
		return { ok: false as const, message: 'گزارش یافت نشد.' };
	}
	return { ok: true as const, message: 'گزارش حذف شد.' };
}
