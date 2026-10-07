import { getDb } from './db.js';

export type CurrencyRow = {
	code: string;
	name: string;
	name_fa: string;
	symbol: string;
	decimals: number;
	enabled: boolean | number;
	sort_order: number;
};

export async function listCurrencies(enabledOnly = true): Promise<CurrencyRow[]> {
	const db = await getDb();
	const query = db('currencies').select('*').orderBy('sort_order', 'asc').orderBy('code', 'asc');
	if (enabledOnly) query.where({ enabled: true });
	return query;
}

export async function getCurrency(code: string): Promise<CurrencyRow | null> {
	const db = await getDb();
	const row = await db('currencies').where({ code: code.trim().toUpperCase() }).first<CurrencyRow>();
	return row ?? null;
}

export async function assertCurrencyCode(code: string) {
	const normalized = code.trim().toUpperCase();
	if (!normalized) {
		return { ok: false as const, message: 'ارز پروژه الزامی است.' };
	}
	const currency = await getCurrency(normalized);
	if (!currency || !currency.enabled) {
		return { ok: false as const, message: 'ارز انتخاب‌شده معتبر نیست.' };
	}
	return { ok: true as const, code: normalized };
}

export function formatCurrencyLabel(currency: Pick<CurrencyRow, 'code' | 'name_fa' | 'symbol'>) {
	return `${currency.name_fa} (${currency.code})`;
}
