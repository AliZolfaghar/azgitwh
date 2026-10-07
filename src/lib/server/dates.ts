/** Normalize SQLite / Knex date values to ISO-8601 for the client. */
export function toIso(value: string | Date | number | null | undefined): string {
	if (value == null || value === '') return '';

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	}

	if (typeof value === 'number') {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? '' : d.toISOString();
	}

	const raw = String(value).trim();
	if (/^\d{10,}$/.test(raw)) {
		const n = Number(raw);
		// seconds vs milliseconds
		const ms = raw.length <= 10 ? n * 1000 : n;
		const d = new Date(ms);
		return Number.isNaN(d.getTime()) ? raw : d.toISOString();
	}

	const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
	const d = new Date(normalized);
	if (!Number.isNaN(d.getTime())) return d.toISOString();

	const fallback = new Date(raw);
	return Number.isNaN(fallback.getTime()) ? raw : fallback.toISOString();
}

export function nowIso() {
	return new Date().toISOString();
}
