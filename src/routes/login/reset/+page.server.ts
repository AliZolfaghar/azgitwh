import { getResetTokenStatus, resetPasswordWithToken } from '#lib/server/passwordReset.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const status = token ? await getResetTokenStatus(token) : null;

	return {
		pageTitle: 'تنظیم کلمه عبور جدید',
		token,
		valid: Boolean(status?.ok),
		message: status && !status.ok ? status.message : null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const token = String(form.get('token') ?? '');
		const newPassword = String(form.get('new_password') ?? '');
		const confirmPassword = String(form.get('confirm_password') ?? '');

		const result = await resetPasswordWithToken(token, newPassword, confirmPassword);
		if (!result.ok) {
			return fail(400, {
				token,
				message: result.message
			});
		}

		redirect(303, `/login?reset=1`);
	}
};
