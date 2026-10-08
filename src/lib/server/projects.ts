import type { AuthUser } from './auth.js';
import { isAdmin } from './auth.js';
import { assertCurrencyCode } from './currencies.js';
import { getDb } from './db.js';
import { parseHourlyRate, parseHourlyRateInput } from './hourlyRates.js';

export type ProjectRow = {
	id: number;
	name: string;
	description: string;
	currency_code: string;
	hourly_rate: number | string | null;
	created_by: number | null;
	created_at: string | Date;
	updated_at: string | Date;
};

export type ProjectWithCurrency = ProjectRow & {
	currency_name_fa: string;
	currency_symbol: string;
	hourlyRate: number | null;
};

export async function countProjects(): Promise<number> {
	const db = await getDb();
	const row = await db('projects').count({ count: '*' }).first<{ count: number | string }>();
	return Number(row?.count ?? 0);
}

export async function listProjects(user?: AuthUser | null): Promise<ProjectWithCurrency[]> {
	const db = await getDb();
	const query = db('projects')
		.select(
			'projects.id',
			'projects.name',
			'projects.description',
			'projects.currency_code',
			'projects.hourly_rate',
			'projects.created_by',
			'projects.created_at',
			'projects.updated_at',
			'currencies.name_fa as currency_name_fa',
			'currencies.symbol as currency_symbol'
		)
		.leftJoin('currencies', 'projects.currency_code', 'currencies.code')
		.orderBy('projects.id', 'asc');

	if (user && !isAdmin(user)) {
		query
			.join('project_members', 'project_members.project_id', 'projects.id')
			.where('project_members.user_id', user.id);
	}

	const rows = await query;
	return rows.map((row) => ({
		...row,
		hourlyRate: parseHourlyRate(row.hourly_rate)
	}));
}

export async function getProjectById(id: number): Promise<ProjectWithCurrency | null> {
	if (!Number.isInteger(id) || id < 1) return null;
	const db = await getDb();
	const row = await db('projects')
		.select(
			'projects.id',
			'projects.name',
			'projects.description',
			'projects.currency_code',
			'projects.hourly_rate',
			'projects.created_by',
			'projects.created_at',
			'projects.updated_at',
			'currencies.name_fa as currency_name_fa',
			'currencies.symbol as currency_symbol'
		)
		.leftJoin('currencies', 'projects.currency_code', 'currencies.code')
		.where({ 'projects.id': id })
		.first<ProjectWithCurrency>();
	if (!row) return null;
	return { ...row, hourlyRate: parseHourlyRate(row.hourly_rate) };
}

export async function createProject(
	name: string,
	description: string,
	currencyCode: string,
	createdBy: number | null,
	hourlyRateInput: unknown = null
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		return { ok: false as const, message: 'نام پروژه الزامی است.' };
	}
	if (trimmedName.length > 120) {
		return { ok: false as const, message: 'نام پروژه حداکثر ۱۲۰ کاراکتر باشد.' };
	}

	const currency = await assertCurrencyCode(currencyCode);
	if (!currency.ok) return currency;

	const rate = parseHourlyRateInput(hourlyRateInput);
	if (!rate.ok) return rate;

	const db = await getDb();
	const exists = await db('projects').where({ name: trimmedName }).first('id');
	if (exists) {
		return { ok: false as const, message: 'پروژه‌ای با این نام وجود دارد.' };
	}

	const [id] = await db('projects').insert({
		name: trimmedName,
		description: description.trim(),
		currency_code: currency.code,
		hourly_rate: rate.value,
		created_by: createdBy
	});

	return { ok: true as const, id };
}

export async function updateProject(
	id: number,
	name: string,
	description: string,
	currencyCode: string,
	hourlyRateInput: unknown = null
) {
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه پروژه نامعتبر است.' };
	}

	const trimmedName = name.trim();
	if (!trimmedName) {
		return { ok: false as const, message: 'نام پروژه الزامی است.' };
	}
	if (trimmedName.length > 120) {
		return { ok: false as const, message: 'نام پروژه حداکثر ۱۲۰ کاراکتر باشد.' };
	}

	const currency = await assertCurrencyCode(currencyCode);
	if (!currency.ok) return currency;

	const rate = parseHourlyRateInput(hourlyRateInput);
	if (!rate.ok) return rate;

	const db = await getDb();
	const project = await db('projects').where({ id }).first('id');
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	const conflict = await db('projects')
		.where({ name: trimmedName })
		.whereNot({ id })
		.first('id');
	if (conflict) {
		return { ok: false as const, message: 'پروژه‌ای با این نام وجود دارد.' };
	}

	await db('projects').where({ id }).update({
		name: trimmedName,
		description: description.trim(),
		currency_code: currency.code,
		hourly_rate: rate.value,
		updated_at: new Date()
	});

	return { ok: true as const };
}

export async function deleteProject(id: number) {
	if (!Number.isInteger(id) || id < 1) {
		return { ok: false as const, message: 'شناسه پروژه نامعتبر است.' };
	}

	const db = await getDb();
	const deleted = await db('projects').where({ id }).del();
	if (!deleted) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	return { ok: true as const };
}
