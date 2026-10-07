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

function asBool(value: unknown): boolean {
	return value === true || value === 1 || value === '1';
}

function num(value: unknown, fallback: number) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

export function toPublicParams(row: ReportParams) {
	return {
		id: row.id,
		linesPerHourAdd: num(row.lines_per_hour_add, 65),
		linesPerHourDel: num(row.lines_per_hour_del, 110),
		deleteWeight: num(row.delete_weight, 0.65),
		minWorkTime: num(row.min_work_time, 0.25),
		maxWorkTimeSingle: num(row.max_work_time_single, 5),
		maxGapMinutes: Math.round(num(row.max_gap_minutes, 90)),
		dailyMaxHours: num(row.daily_max_hours, 8),
		excludeWww: asBool(row.exclude_www)
	};
}

export async function getReportParams(): Promise<ReportParams> {
	const db = await getDb();
	const row = await db('report_params').orderBy('id', 'asc').first<ReportParams>();
	if (!row) {
		throw new Error('report_params row is missing — run migrations');
	}
	return {
		...row,
		exclude_www: asBool(row.exclude_www),
		lines_per_hour_add: num(row.lines_per_hour_add, 65),
		lines_per_hour_del: num(row.lines_per_hour_del, 110),
		delete_weight: num(row.delete_weight, 0.65),
		min_work_time: num(row.min_work_time, 0.25),
		max_work_time_single: num(row.max_work_time_single, 5),
		max_gap_minutes: Math.round(num(row.max_gap_minutes, 90)),
		daily_max_hours: num(row.daily_max_hours, 8)
	};
}

export async function saveReportParams(input: ReportParamsInput) {
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

	const current = await getReportParams();
	const db = await getDb();
	await db('report_params')
		.where({ id: current.id })
		.update({
			lines_per_hour_add: input.lines_per_hour_add,
			lines_per_hour_del: input.lines_per_hour_del,
			delete_weight: input.delete_weight,
			min_work_time: input.min_work_time,
			max_work_time_single: input.max_work_time_single,
			max_gap_minutes: input.max_gap_minutes,
			daily_max_hours: input.daily_max_hours,
			exclude_www: input.exclude_www,
			updated_at: new Date()
		});

	return { ok: true as const, message: 'پارامترهای گزارش ذخیره شد.' };
}
