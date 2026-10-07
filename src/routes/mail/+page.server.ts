import {
	getMailSettings,
	saveMailSettings,
	sendTestMail,
	testMailConnection,
	toPublicSettings,
	type MailProvider,
	type MailSettingsInput
} from '#lib/server/mail.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function readSettingsForm(form: FormData): MailSettingsInput {
	const provider = String(form.get('provider') ?? 'smtp') as MailProvider;
	const port = Number(form.get('port'));

	return {
		provider: provider === 'gmail' ? 'gmail' : 'smtp',
		enabled: form.get('enabled') === 'on' || form.get('enabled') === 'true',
		host: String(form.get('host') ?? ''),
		port: Number.isFinite(port) ? port : 587,
		secure: form.get('secure') === 'on' || form.get('secure') === 'true',
		username: String(form.get('username') ?? ''),
		password: String(form.get('password') ?? ''),
		from_email: String(form.get('from_email') ?? ''),
		from_name: String(form.get('from_name') ?? '')
	};
}

function publicForm(input: MailSettingsInput, extra: Record<string, unknown> = {}) {
	const { password: _password, ...rest } = input;
	return { ...rest, ...extra };
}

export const load: PageServerLoad = async ({ locals }) => {
	const settings = toPublicSettings(await getMailSettings());

	return {
		pageTitle: 'تنظیمات ایمیل',
		settings,
		defaultTestTo: locals.user?.email ?? ''
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const input = readSettingsForm(form);
		const result = await saveMailSettings(input);
		if (!result.ok) {
			return fail(400, { action: 'save', ...publicForm(input), message: result.message });
		}
		const settings = toPublicSettings(await getMailSettings());
		return {
			action: 'save',
			success: true as const,
			message: result.message,
			...publicForm(settings)
		};
	},

	test: async ({ request }) => {
		const form = await request.formData();
		const input = readSettingsForm(form);
		const result = await testMailConnection(input);
		if (!result.ok) {
			return fail(400, { action: 'test', ...publicForm(input), message: result.message });
		}
		return {
			action: 'test',
			success: true as const,
			message: result.message,
			...publicForm(input)
		};
	},

	sendTest: async ({ request, locals }) => {
		const form = await request.formData();
		const input = readSettingsForm(form);
		const to = String(form.get('test_to') ?? locals.user?.email ?? '');
		const result = await sendTestMail(to, input);
		if (!result.ok) {
			return fail(400, {
				action: 'sendTest',
				...publicForm(input, { test_to: to }),
				message: result.message
			});
		}
		return {
			action: 'sendTest',
			success: true as const,
			message: result.message,
			...publicForm(input, { test_to: to })
		};
	}
};
