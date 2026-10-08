import { getDb } from './db.js';

export type RateContext = {
	projectRate: number;
	/** repo display name (lower) -> rate */
	repoRates: Map<string, number>;
	/** repo display name (lower) -> repo id */
	repoIdsByName: Map<string, number>;
	/** `${repoId}\0${emailLower}` -> rate */
	developerRates: Map<string, number>;
};

export function parseHourlyRate(value: unknown): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0) return null;
	return Number(n.toFixed(2));
}

export function parseHourlyRateInput(value: unknown): {
	ok: true;
	value: number | null;
} | {
	ok: false;
	message: string;
} {
	const raw = String(value ?? '').trim();
	if (!raw) return { ok: true, value: null };
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) {
		return { ok: false, message: 'نرخ نفرساعت باید عدد صفر یا بزرگ‌تر باشد.' };
	}
	return { ok: true, value: Number(n.toFixed(2)) };
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function normalizeRepoName(name: string) {
	return name.trim().toLowerCase();
}

/** Pick first repo name from a "a, b" list. */
export function primaryRepoName(repos: string) {
	const first = repos
		.split(',')
		.map((part) => part.trim())
		.find(Boolean);
	return first ?? '';
}

/**
 * Priority: developer@repo → repo → project
 */
export function resolveHourlyRate(
	ctx: RateContext,
	email: string,
	repos: string
): number {
	const repoName = primaryRepoName(repos);
	const repoKey = normalizeRepoName(repoName);
	const emailKey = normalizeEmail(email);

	if (repoKey) {
		const repoId = ctx.repoIdsByName.get(repoKey);
		if (repoId != null) {
			const developerRate = ctx.developerRates.get(`${repoId}\0${emailKey}`);
			if (developerRate != null) return developerRate;
		}
		const repoRate = ctx.repoRates.get(repoKey);
		if (repoRate != null) return repoRate;
	}

	return ctx.projectRate;
}

export async function loadRateContext(projectId: number): Promise<RateContext> {
	const db = await getDb();
	const project = await db('projects')
		.where({ id: projectId })
		.first<{ hourly_rate: number | string | null }>();

	const repos = await db('project_repositories')
		.where({ project_id: projectId })
		.select('id', 'name', 'hourly_rate');

	const developerRows = await db('project_developer_rates')
		.where({ project_id: projectId })
		.select('repository_id', 'email', 'hourly_rate');

	const repoRates = new Map<string, number>();
	const repoIdsByName = new Map<string, number>();
	for (const repo of repos) {
		const key = normalizeRepoName(String(repo.name ?? ''));
		if (!key) continue;
		repoIdsByName.set(key, Number(repo.id));
		const rate = parseHourlyRate(repo.hourly_rate);
		if (rate != null) repoRates.set(key, rate);
	}

	const developerRates = new Map<string, number>();
	for (const row of developerRows) {
		const rate = parseHourlyRate(row.hourly_rate);
		if (rate == null) continue;
		developerRates.set(
			`${Number(row.repository_id)}\0${normalizeEmail(String(row.email ?? ''))}`,
			rate
		);
	}

	return {
		projectRate: parseHourlyRate(project?.hourly_rate) ?? 0,
		repoRates,
		repoIdsByName,
		developerRates
	};
}

export type DeveloperRateRow = {
	id: number;
	email: string;
	hourlyRate: number;
};

export async function listDeveloperRates(
	projectId: number,
	repositoryId: number
): Promise<DeveloperRateRow[]> {
	const db = await getDb();
	const rows = await db('project_developer_rates')
		.where({ project_id: projectId, repository_id: repositoryId })
		.orderBy('email', 'asc')
		.select('id', 'email', 'hourly_rate');

	return rows.map((row) => ({
		id: Number(row.id),
		email: String(row.email),
		hourlyRate: Number(row.hourly_rate) || 0
	}));
}

export async function setDeveloperRates(
	projectId: number,
	repositoryId: number,
	entries: Array<{ email: string; hourlyRate: number }>
) {
	const db = await getDb();
	const repo = await db('project_repositories')
		.where({ id: repositoryId, project_id: projectId })
		.first('id');
	if (!repo) {
		return { ok: false as const, message: 'ریپازیتوری یافت نشد.' };
	}

	const cleaned: Array<{ email: string; hourlyRate: number }> = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		const email = normalizeEmail(entry.email);
		if (!email || !email.includes('@')) {
			return { ok: false as const, message: `ایمیل نامعتبر: ${entry.email || '—'}` };
		}
		if (!Number.isFinite(entry.hourlyRate) || entry.hourlyRate < 0) {
			return { ok: false as const, message: `نرخ نامعتبر برای ${email}` };
		}
		if (seen.has(email)) continue;
		seen.add(email);
		cleaned.push({ email, hourlyRate: Number(entry.hourlyRate.toFixed(2)) });
	}

	await db.transaction(async (trx) => {
		await trx('project_developer_rates')
			.where({ project_id: projectId, repository_id: repositoryId })
			.del();
		if (!cleaned.length) return;
		await trx('project_developer_rates').insert(
			cleaned.map((item) => ({
				project_id: projectId,
				repository_id: repositoryId,
				email: item.email,
				hourly_rate: item.hourlyRate
			}))
		);
	});

	return { ok: true as const, count: cleaned.length };
}
