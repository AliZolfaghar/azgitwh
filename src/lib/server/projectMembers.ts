import type { AuthUser } from './auth.js';
import { isAdmin } from './auth.js';
import { getDb } from './db.js';
import { error } from '@sveltejs/kit';

export type ProjectMember = {
	userId: number;
	email: string;
	displayName: string;
	role: string;
};

export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
	if (!Number.isInteger(projectId) || projectId < 1) return false;
	if (!Number.isInteger(userId) || userId < 1) return false;

	const db = await getDb();
	const row = await db('project_members').where({ project_id: projectId, user_id: userId }).first('id');
	return Boolean(row);
}

export async function canAccessProject(user: AuthUser | null | undefined, projectId: number) {
	if (!user) return false;
	if (isAdmin(user)) return true;
	return isProjectMember(projectId, user.id);
}

export async function assertCanAccessProject(user: AuthUser | null | undefined, projectId: number) {
	const ok = await canAccessProject(user, projectId);
	if (!ok) error(403, 'دسترسی به این پروژه ندارید');
}

export async function listProjectMembers(projectId: number): Promise<ProjectMember[]> {
	const db = await getDb();
	const rows = await db('project_members')
		.join('users', 'users.id', 'project_members.user_id')
		.select(
			'users.id as userId',
			'users.email',
			'users.display_name as displayName',
			'users.role'
		)
		.where({ 'project_members.project_id': projectId })
		.orderBy('users.id', 'asc');

	return rows.map((row) => ({
		userId: row.userId,
		email: row.email,
		displayName: row.displayName || '',
		role: row.role
	}));
}

export async function listMemberCountsByProject(): Promise<Map<number, number>> {
	const db = await getDb();
	const rows = await db('project_members')
		.select('project_id')
		.count({ count: '*' })
		.groupBy('project_id');

	const map = new Map<number, number>();
	for (const row of rows) {
		map.set(Number(row.project_id), Number(row.count ?? 0));
	}
	return map;
}

/** Map of projectId -> userIds with access */
export async function listAllProjectMemberIds(): Promise<Map<number, number[]>> {
	const db = await getDb();
	const rows = await db('project_members').select('project_id', 'user_id').orderBy('user_id', 'asc');
	const map = new Map<number, number[]>();
	for (const row of rows) {
		const projectId = Number(row.project_id);
		const list = map.get(projectId) ?? [];
		list.push(Number(row.user_id));
		map.set(projectId, list);
	}
	return map;
}

export async function setProjectMembers(projectId: number, userIds: number[]) {
	if (!Number.isInteger(projectId) || projectId < 1) {
		return { ok: false as const, message: 'شناسه پروژه نامعتبر است.' };
	}

	const db = await getDb();
	const project = await db('projects').where({ id: projectId }).first('id');
	if (!project) {
		return { ok: false as const, message: 'پروژه یافت نشد.' };
	}

	const uniqueIds = [...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))];

	if (uniqueIds.length > 0) {
		const existing = await db('users').whereIn('id', uniqueIds).select('id');
		if (existing.length !== uniqueIds.length) {
			return { ok: false as const, message: 'یکی از کاربران انتخاب‌شده معتبر نیست.' };
		}
	}

	await db.transaction(async (trx) => {
		await trx('project_members').where({ project_id: projectId }).del();
		if (uniqueIds.length === 0) return;
		await trx('project_members').insert(
			uniqueIds.map((userId) => ({
				project_id: projectId,
				user_id: userId,
				created_at: new Date().toISOString()
			}))
		);
	});

	return { ok: true as const, count: uniqueIds.length };
}

export async function countProjectsForUser(user: AuthUser): Promise<number> {
	if (isAdmin(user)) {
		const db = await getDb();
		const row = await db('projects').count({ count: '*' }).first<{ count: number | string }>();
		return Number(row?.count ?? 0);
	}

	const db = await getDb();
	const row = await db('project_members')
		.where({ user_id: user.id })
		.count({ count: '*' })
		.first<{ count: number | string }>();
	return Number(row?.count ?? 0);
}
