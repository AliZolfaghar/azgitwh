import { isAdmin } from '#lib/server/auth.js';
import { toIso } from '#lib/server/dates.js';
import { ROLE_LABELS, parseRole } from '#lib/server/roles.js';
import {
	canDeleteUser,
	createUser,
	deleteUser,
	listUsers,
	updateUser
} from '#lib/server/users.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!isAdmin(locals.user)) error(403, 'دسترسی فقط برای ادمین');

	const currentUserId = locals.user!.id;
	const users = await listUsers();
	const adminCount = users.filter((user) => user.role === 'admin').length;

	return {
		pageTitle: 'مدیریت کاربران',
		currentUserId,
		roleLabels: ROLE_LABELS,
		users: users.map((user) => ({
			id: user.id,
			email: user.email,
			displayName: user.display_name,
			role: user.role,
			roleLabel: ROLE_LABELS[user.role],
			createdAt: toIso(user.created_at),
			updatedAt: toIso(user.updated_at),
			canDelete: canDeleteUser(user, currentUserId, adminCount)
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'create', message: 'دسترسی فقط برای ادمین.' });
		}

		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '');
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const role = parseRole(form.get('role'), 'user');

		const result = await createUser(email, password, displayName, role);
		if (!result.ok) {
			return fail(400, {
				action: 'create',
				display_name: displayName,
				email,
				role,
				message: result.message
			});
		}

		return { action: 'create', success: true as const, message: 'کاربر اضافه شد.' };
	},

	update: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'update', message: 'دسترسی فقط برای ادمین.' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		const displayName = String(form.get('display_name') ?? '');
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const role = parseRole(form.get('role'), 'user');

		const result = await updateUser(
			id,
			email,
			password.trim() ? password : undefined,
			displayName,
			locals.user!.id,
			role
		);
		if (!result.ok) {
			return fail(400, {
				action: 'update',
				id,
				display_name: displayName,
				email,
				role,
				message: result.message
			});
		}

		if (id === locals.user!.id) {
			locals.user.email = email.trim().toLowerCase();
			locals.user.displayName = displayName.trim();
			locals.user.role = result.role;
		}

		return { action: 'update', success: true as const, message: 'کاربر به‌روزرسانی شد.' };
	},

	delete: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) {
			return fail(403, { action: 'delete', message: 'دسترسی فقط برای ادمین.' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));

		const result = await deleteUser(id, locals.user!.id);
		if (!result.ok) {
			return fail(400, { action: 'delete', id, message: result.message });
		}

		return { action: 'delete', success: true as const, message: 'کاربر حذف شد.' };
	}
};
