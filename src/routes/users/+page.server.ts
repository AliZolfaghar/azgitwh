import { ADMIN_EMAIL } from '#lib/server/auth.js';
import {
	createUser,
	deleteUser,
	listUsers,
	updateUser
} from '#lib/server/users.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function toIso(value: string | Date) {
	return value instanceof Date ? value.toISOString() : String(value);
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUserId = locals.user!.id;
	const users = await listUsers();

	return {
		pageTitle: 'مدیریت کاربران',
		currentUserId,
		users: users.map((user) => ({
			id: user.id,
			email: user.email,
			displayName: user.display_name,
			createdAt: toIso(user.created_at),
			updatedAt: toIso(user.updated_at),
			canDelete: user.id !== currentUserId && user.email !== ADMIN_EMAIL
		}))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		const result = await createUser(email, password);
		if (!result.ok) {
			return fail(400, { action: 'create', email, message: result.message });
		}

		return { action: 'create', success: true as const, message: 'کاربر اضافه شد.' };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		const result = await updateUser(
			id,
			email,
			password.trim() ? password : undefined,
			locals.user!.id
		);
		if (!result.ok) {
			return fail(400, { action: 'update', id, email, message: result.message });
		}

		return { action: 'update', success: true as const, message: 'کاربر به‌روزرسانی شد.' };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));

		const result = await deleteUser(id, locals.user!.id);
		if (!result.ok) {
			return fail(400, { action: 'delete', id, message: result.message });
		}

		return { action: 'delete', success: true as const, message: 'کاربر حذف شد.' };
	}
};
