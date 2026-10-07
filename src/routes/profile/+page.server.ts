import {
	changeOwnPassword,
	getUserProfile,
	updateOwnProfile
} from '#lib/server/profile.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function toIso(value: string | Date) {
	return value instanceof Date ? value.toISOString() : String(value);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const profile = await getUserProfile(locals.user.id);
	if (!profile) error(404, 'کاربر یافت نشد');

	return {
		pageTitle: 'پروفایل من',
		profile: {
			id: profile.id,
			email: profile.email,
			displayName: profile.display_name,
			createdAt: toIso(profile.created_at),
			updatedAt: toIso(profile.updated_at)
		}
	};
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'profile', message: 'نشست معتبر نیست.' });

		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const displayName = String(form.get('display_name') ?? '');

		const result = await updateOwnProfile(locals.user.id, {
			email,
			display_name: displayName
		});

		if (!result.ok) {
			return fail(400, {
				action: 'profile',
				email,
				display_name: displayName,
				message: result.message
			});
		}

		// Keep locals in sync for this response cycle is not needed; next request loads session.
		locals.user.email = result.email;

		return { action: 'profile', success: true as const, message: result.message };
	},

	password: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'password', message: 'نشست معتبر نیست.' });

		const form = await request.formData();
		const result = await changeOwnPassword(locals.user.id, {
			currentPassword: String(form.get('current_password') ?? ''),
			newPassword: String(form.get('new_password') ?? ''),
			confirmPassword: String(form.get('confirm_password') ?? '')
		});

		if (!result.ok) {
			return fail(400, { action: 'password', message: result.message });
		}

		return { action: 'password', success: true as const, message: result.message };
	}
};
