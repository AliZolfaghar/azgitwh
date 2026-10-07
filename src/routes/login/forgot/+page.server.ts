import { requestPasswordReset } from '#lib/server/passwordReset.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		pageTitle: 'بازیابی کلمه عبور'
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const result = await requestPasswordReset(email, url.origin);

		if (!result.ok) {
			return fail(400, { email, message: result.message });
		}

		return { success: true as const, email, message: result.message };
	}
};
