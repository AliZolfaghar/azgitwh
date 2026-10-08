import { getDb } from './db.js';

export type ReportParams = {
	id: number;
	lines_per_hour_add: number;
	lines_per_hour_del: number;
	delete_weight: number;
	min_work_time: number;
	max_work_time_single: number;
	max_gap_minutes: number;
	daily_max_hours: number;
	exclude_www: boolean;
	created_at: string | Date;
	updated_at: string | Date;
};

export type ReportParamsInput = {
	lines_per_hour_add: number;
	lines_per_hour_del: number;
	delete_weight: number;
	min_work_time: number;
	max_work_time_single: number;
	max_gap_minutes: number;
	daily_max_hours: number;
	exclude_www: boolean;
};

export type PublicReportParams = {
	linesPerHourAdd: number;
	linesPerHourDel: number;
	deleteWeight: number;
	minWorkTime: number;
	maxWorkTimeSingle: number;
	maxGapMinutes: number;
	dailyMaxHours: number;
	excludeWww: boolean;
};

function asBool(value: unknown): boolean {
	return value === true || value === 1 || value === '1';
}

function num(value: unknown, fallback: number) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function normalizeRow(row: Partial<ReportParamsInput> & { exclude_www?: unknown }): ReportParamsInput {
	return {
		lines_per_hour_add: num(row.lines_per_hour_add, 65),
		lines_per_hour_del: num(row.lines_per_hour_del, 110),
		delete_weight: num(row.delete_weight, 0.65),
		min_work_time: num(row.min_work_time, 0.25),
		max_work_time_single: num(row.max_work_time_single, 5),
		max_gap_minutes: Math.round(num(row.max_gap_minutes, 90)),
		daily_max_hours: num(row.daily_max_hours, 8),
		exclude_www: asBool(row.exclude_www)
	};
}

export function toPublicParams(
	row: ReportParams | ReportParamsInput | (ReportParamsInput & { id?: number })
): PublicReportParams & { id?: number } {
	const normalized = normalizeRow(row);
	return {
		...('id' in row && row.id != null ? { id: Number(row.id) } : {}),
		linesPerHourAdd: normalized.lines_per_hour_add,
		linesPerHourDel: normalized.lines_per_hour_del,
		deleteWeight: normalized.delete_weight,
		minWorkTime: normalized.min_work_time,
		maxWorkTimeSingle: normalized.max_work_time_single,
		maxGapMinutes: normalized.max_gap_minutes,
		dailyMaxHours: normalized.daily_max_hours,
		excludeWww: normalized.exclude_www
	};
}

export function parseReportParamsForm(form: FormData): ReportParamsInput {
	return {
		lines_per_hour_add: Number(form.get('lines_per_hour_add')),
		lines_per_hour_del: Number(form.get('lines_per_hour_del')),
		delete_weight: Number(form.get('delete_weight')),
		min_work_time: Number(form.get('min_work_time')),
		max_work_time_single: Number(form.get('max_work_time_single')),
		max_gap_minutes: Number(form.get('max_gap_minutes')),
		daily_max_hours: Number(form.get('daily_max_hours')),
		exclude_www: form.get('exclude_www') === 'on' || form.get('exclude_www') === 'true'
	};
}

function validateReportParamsInput(input: ReportParamsInput) {
	if (input.lines_per_hour_add <= 0 || input.lines_per_hour_del <= 0) {
		return { ok: false as const, message: 'نرخ خط در ساعت باید بزرگ‌تر از صفر باشد.' };
	}
	if (input.delete_weight < 0 || input.delete_weight > 2) {
		return { ok: false as const, message: 'وزن حذف باید بین ۰ و ۲ باشد.' };
	}
	if (input.min_work_time < 0 || input.max_work_time_single <= 0) {
		return { ok: false as const, message: 'محدودهٔ زمان کار نامعتبر است.' };
	}
	if (input.min_work_time > input.max_work_time_single) {
		return { ok: false as const, message: 'حداقل زمان نمی‌تواند از حداکثر بیشتر باشد.' };
	}
	if (!Number.isInteger(input.max_gap_minutes) || input.max_gap_minutes < 1) {
		return { ok: false as const, message: 'فاصلهٔ ادغام سشن باید عدد صحیح مثبت باشد.' };
	}
	if (input.daily_max_hours <= 0 || input.daily_max_hours > 24) {
		return { ok: false as const, message: 'سقف روزانه باید بین ۰ و ۲۴ ساعت باشد.' };
	}
	return { ok: true as const };
}

export async function getReportParams(): Promise<ReportParams> {
	const db = await getDb();
	const row = await db('report_params').orderBy('id', 'asc').first<ReportParams>();
	if (!row) {
		throw new Error('report_params row is missing — run migrations');
	}
	return {
		...row,
		...normalizeRow(row)
	};
}

export async function saveReportParams(input: ReportParamsInput) {
	const validated = validateReportParamsInput(input);
	if (!validated.ok) return validated;

	const current = await getReportParams();
	const db = await getDb();
	await db('report_params')
		.where({ id: current.id })
		.update({
			...input,
			updated_at: new Date()
		});

	return { ok: true as const, message: 'پارامترهای گزارش ذخیره شد.' };
}

export async function getProjectReportParamsOverride(
	projectId: number
): Promise<ReportParamsInput | null> {
	const db = await getDb();
	const row = await db('project_report_params').where({ project_id: projectId }).first();
	if (!row) return null;
	return normalizeRow(row);
}

/** Project override if present, otherwise global defaults. */
export async function getEffectiveReportParams(projectId: number): Promise<{
	params: ReportParamsInput;
	source: 'project' | 'global';
}> {
	const override = await getProjectReportParamsOverride(projectId);
	if (override) {
		return { params: override, source: 'project' };
	}
	const global = await getReportParams();
	return {
		params: normalizeRow(global),
		source: 'global'
	};
}

export async function saveProjectReportParams(projectId: number, input: ReportParamsInput) {
	const validated = validateReportParamsInput(input);
	if (!validated.ok) return validated;

	const db = await getDb();
	const project = await db('projects').where({ id: projectId }).first('id');
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	const existing = await db('project_report_params').where({ project_id: projectId }).first('id');
	const payload = {
		...input,
		updated_at: new Date()
	};

	if (existing) {
		await db('project_report_params').where({ id: existing.id }).update(payload);
	} else {
		await db('project_report_params').insert({
			project_id: projectId,
			...input,
			created_at: new Date(),
			updated_at: new Date()
		});
	}

	return { ok: true as const, message: 'پارامترهای اختصاصی این پروژه ذخیره شد.' };
}

export async function clearProjectReportParams(projectId: number) {
	const db = await getDb();
	const deleted = await db('project_report_params').where({ project_id: projectId }).del();
	return {
		ok: true as const,
		cleared: deleted > 0,
		message:
			deleted > 0
				? 'پارامترهای اختصاصی حذف شد؛ از این پس پارامترهای عمومی استفاده می‌شود.'
				: 'این پروژه از قبل پارامتر اختصاصی نداشت.'
	};
}
