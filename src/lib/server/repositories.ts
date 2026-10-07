import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { getDb } from './db.js';
import { getProjectById } from './projects.js';

export type RepoKind = 'local' | 'remote';

export type RepositoryRow = {
	id: number;
	project_id: number;
	name: string;
	kind: RepoKind;
	location: string;
	branch: string;
	enabled: boolean | number;
	created_at: string | Date;
	updated_at: string | Date;
};

export type RepositoryInput = {
	name: string;
	kind: RepoKind;
	location: string;
	branch?: string;
	enabled?: boolean;
};

function asBool(value: unknown): boolean {
	return value === true || value === 1 || value === '1';
}

function normalizeKind(value: string): RepoKind {
	return value === 'remote' ? 'remote' : 'local';
}

function basenameFromLocation(location: string, kind: RepoKind): string {
	if (kind === 'local') {
		return path.basename(location.replace(/[\\/]+$/, '')) || location;
	}
	try {
		const cleaned = location.replace(/\.git$/i, '');
		const parts = cleaned.split(/[/:]/).filter(Boolean);
		return parts.at(-1) || cleaned;
	} catch {
		return location;
	}
}

export function isRemoteGitUrl(value: string): boolean {
	const v = value.trim();
	if (/^https?:\/\/.+/i.test(v)) return true;
	if (/^git@.+:.+/.test(v)) return true;
	if (/^ssh:\/\/.+/i.test(v)) return true;
	return false;
}

async function pathLooksLikeGitRepo(dir: string): Promise<boolean> {
	try {
		await access(path.join(dir, '.git'), constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function validateRepositoryLocation(kind: RepoKind, location: string) {
	const trimmed = location.trim();
	if (!trimmed) {
		return { ok: false as const, message: 'مسیر یا آدرس ریپازیتوری الزامی است.' };
	}

	if (kind === 'local') {
		const resolved = path.resolve(trimmed);
		try {
			await access(resolved, constants.F_OK);
		} catch {
			return { ok: false as const, message: 'مسیر محلی پیدا نشد.' };
		}
		if (!(await pathLooksLikeGitRepo(resolved))) {
			return {
				ok: false as const,
				message: 'مسیر انتخاب‌شده یک ریپازیتوری Git نیست (پوشهٔ .git یافت نشد).'
			};
		}
		return { ok: true as const, location: resolved };
	}

	if (!isRemoteGitUrl(trimmed)) {
		return {
			ok: false as const,
			message: 'آدرس آنلاین باید http(s)، ssh یا git@ باشد.'
		};
	}
	return { ok: true as const, location: trimmed };
}

export async function listProjectRepositories(projectId: number): Promise<RepositoryRow[]> {
	const db = await getDb();
	const rows = await db('project_repositories')
		.where({ project_id: projectId })
		.orderBy('id', 'asc');
	return rows.map((row) => ({
		...row,
		kind: normalizeKind(row.kind),
		enabled: asBool(row.enabled)
	}));
}

export async function countRepositoriesByProject(): Promise<Map<number, number>> {
	const db = await getDb();
	const rows = await db('project_repositories')
		.select('project_id')
		.count({ count: '*' })
		.groupBy('project_id');

	const map = new Map<number, number>();
	for (const row of rows as { project_id: number; count: number | string }[]) {
		map.set(row.project_id, Number(row.count));
	}
	return map;
}

export async function addRepository(projectId: number, input: RepositoryInput) {
	const project = await getProjectById(projectId);
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	const kind = normalizeKind(input.kind);
	const validated = await validateRepositoryLocation(kind, input.location);
	if (!validated.ok) return validated;

	const name = input.name.trim() || basenameFromLocation(validated.location, kind);
	if (!name) {
		return { ok: false as const, message: 'نام ریپازیتوری الزامی است.' };
	}

	const db = await getDb();
	const exists = await db('project_repositories')
		.where({ project_id: projectId, location: validated.location })
		.first('id');
	if (exists) {
		return { ok: false as const, message: 'این ریپازیتوری قبلاً به پروژه اضافه شده است.' };
	}

	const [id] = await db('project_repositories').insert({
		project_id: projectId,
		name,
		kind,
		location: validated.location,
		branch: (input.branch ?? '').trim(),
		enabled: Boolean(input.enabled)
	});

	return { ok: true as const, id };
}

export async function updateRepository(
	projectId: number,
	repoId: number,
	input: RepositoryInput
) {
	const db = await getDb();
	const current = await db('project_repositories')
		.where({ id: repoId, project_id: projectId })
		.first('id');
	if (!current) {
		return { ok: false as const, message: 'ریپازیتوری یافت نشد.' };
	}

	const kind = normalizeKind(input.kind);
	const validated = await validateRepositoryLocation(kind, input.location);
	if (!validated.ok) return validated;

	const name = input.name.trim() || basenameFromLocation(validated.location, kind);

	const conflict = await db('project_repositories')
		.where({ project_id: projectId, location: validated.location })
		.whereNot({ id: repoId })
		.first('id');
	if (conflict) {
		return { ok: false as const, message: 'این مسیر/آدرس قبلاً ثبت شده است.' };
	}

	await db('project_repositories')
		.where({ id: repoId })
		.update({
			name,
			kind,
			location: validated.location,
			branch: (input.branch ?? '').trim(),
			enabled: Boolean(input.enabled),
			updated_at: new Date()
		});

	return { ok: true as const };
}

export async function deleteRepository(projectId: number, repoId: number) {
	const db = await getDb();
	const deleted = await db('project_repositories')
		.where({ id: repoId, project_id: projectId })
		.del();
	if (!deleted) {
		return { ok: false as const, message: 'ریپازیتوری یافت نشد.' };
	}
	return { ok: true as const };
}
