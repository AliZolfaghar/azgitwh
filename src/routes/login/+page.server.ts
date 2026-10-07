import {
	createSession,
	isValidEmail,
	verifyCredentials
} from '#lib/server/auth.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		from: url.searchParams.get('from') ?? '/'
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const fromRaw = String(form.get('from') ?? '/');
		const from = fromRaw.startsWith('/') && !fromRaw.startsWith('//') ? fromRaw : '/';

		if (!email || !password) {
			return fail(400, {
				email,
				from,
				message: 'ایمیل و کلمه عبور را وارد کنید.'
			});
		}

		if (!isValidEmail(email)) {
			return fail(400, {
				email,
				from,
				message: 'نام کاربری باید یک ایمیل معتبر باشد.'
			});
		}

		const user = await verifyCredentials(email, password);
		if (!user) {
			return fail(401, {
				email,
				from,
				message: 'ایمیل یا کلمه عبور نادرست است.'
			});
		}

		await createSession(user, cookies);
		redirect(303, from);
	}
};
