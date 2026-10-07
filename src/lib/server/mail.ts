import nodemailer from 'nodemailer';
import { getDb } from './db.js';
import { buildTestMail } from './mailTemplate.js';

export type MailProvider = 'smtp' | 'gmail';

export type MailSettings = {
	id: number;
	provider: MailProvider;
	enabled: boolean;
	host: string;
	port: number;
	secure: boolean;
	username: string;
	password: string;
	from_email: string;
	from_name: string;
};

export type MailSettingsPublic = Omit<MailSettings, 'password'> & {
	hasPassword: boolean;
};

export type MailSettingsInput = {
	provider: MailProvider;
	enabled: boolean;
	host: string;
	port: number;
	secure: boolean;
	username: string;
	password?: string;
	from_email: string;
	from_name: string;
};

const GMAIL_PRESET = {
	host: 'smtp.gmail.com',
	port: 465,
	secure: true
} as const;

function asBool(value: unknown): boolean {
	return value === true || value === 1 || value === '1';
}

function normalizeProvider(value: string): MailProvider {
	return value === 'gmail' ? 'gmail' : 'smtp';
}

function applyProviderDefaults(input: MailSettingsInput): MailSettingsInput {
	if (input.provider !== 'gmail') return input;
	return {
		...input,
		host: GMAIL_PRESET.host,
		port: GMAIL_PRESET.port,
		secure: GMAIL_PRESET.secure
	};
}

export function toPublicSettings(row: MailSettings): MailSettingsPublic {
	const { password, ...rest } = row;
	return {
		...rest,
		enabled: asBool(rest.enabled),
		secure: asBool(rest.secure),
		provider: normalizeProvider(rest.provider),
		hasPassword: Boolean(password)
	};
}

export async function getMailSettings(): Promise<MailSettings> {
	const db = await getDb();
	const row = await db('mail_settings').orderBy('id', 'asc').first<MailSettings>();
	if (!row) {
		throw new Error('mail_settings row is missing — run migrations');
	}
	return {
		...row,
		enabled: asBool(row.enabled),
		secure: asBool(row.secure),
		provider: normalizeProvider(row.provider),
		port: Number(row.port)
	};
}

export async function saveMailSettings(input: MailSettingsInput) {
	const normalized = applyProviderDefaults(input);
	const current = await getMailSettings();
	const password =
		normalized.password && normalized.password.trim()
			? normalized.password.trim()
			: current.password;

	// Allow turning mail off without re-validating connection fields.
	if (!normalized.enabled) {
		const db = await getDb();
		await db('mail_settings')
			.where({ id: current.id })
			.update({
				enabled: false,
				provider: normalized.provider,
				host: normalized.host.trim() || current.host,
				port: Number.isInteger(normalized.port) ? normalized.port : current.port,
				secure: normalized.secure,
				username: normalized.username.trim() || current.username,
				password,
				from_email: normalized.from_email.trim() || current.from_email,
				from_name: normalized.from_name.trim() || current.from_name || 'azgitwh',
				updated_at: new Date()
			});
		return { ok: true as const, message: 'ارسال ایمیل غیرفعال شد.' };
	}

	if (!normalized.host.trim()) {
		return { ok: false as const, message: 'میزبان SMTP الزامی است.' };
	}
	if (!Number.isInteger(normalized.port) || normalized.port < 1 || normalized.port > 65535) {
		return { ok: false as const, message: 'پورت نامعتبر است.' };
	}
	if (!normalized.from_email.trim()) {
		return { ok: false as const, message: 'ایمیل فرستنده الزامی است.' };
	}
	if (!password) {
		return { ok: false as const, message: 'برای فعال‌سازی، کلمه عبور / App Password لازم است.' };
	}

	const db = await getDb();
	await db('mail_settings')
		.where({ id: current.id })
		.update({
			provider: normalized.provider,
			enabled: true,
			host: normalized.host.trim(),
			port: normalized.port,
			secure: normalized.secure,
			username: normalized.username.trim(),
			password,
			from_email: normalized.from_email.trim(),
			from_name: normalized.from_name.trim() || 'azgitwh',
			updated_at: new Date()
		});

	return { ok: true as const, message: 'تنظیمات ایمیل ذخیره شد.' };
}

function createTransport(settings: MailSettings) {
	return nodemailer.createTransport({
		host: settings.host,
		port: settings.port,
		secure: settings.secure,
		auth: settings.username
			? {
					user: settings.username,
					pass: settings.password
				}
			: undefined
	});
}

export async function testMailConnection(override?: Partial<MailSettingsInput>) {
	const current = await getMailSettings();
	const merged = applyProviderDefaults({
		provider: override?.provider ?? current.provider,
		enabled: override?.enabled ?? current.enabled,
		host: override?.host ?? current.host,
		port: override?.port ?? current.port,
		secure: override?.secure ?? current.secure,
		username: override?.username ?? current.username,
		password:
			override?.password && override.password.trim()
				? override.password.trim()
				: current.password,
		from_email: override?.from_email ?? current.from_email,
		from_name: override?.from_name ?? current.from_name
	});

	if (!merged.host.trim() || !merged.password) {
		return {
			ok: false as const,
			message: 'برای تست اتصال، میزبان و کلمه عبور را وارد کنید (یا قبلاً ذخیره کرده باشید).'
		};
	}

	const transporter = createTransport({
		id: current.id,
		...merged,
		password: merged.password!
	});

	try {
		await transporter.verify();
		return { ok: true as const, message: 'اتصال SMTP برقرار شد.' };
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return { ok: false as const, message: `اتصال ناموفق: ${detail}` };
	} finally {
		transporter.close();
	}
}

export async function sendTestMail(to: string, override?: Partial<MailSettingsInput>) {
	const current = await getMailSettings();
	const merged = applyProviderDefaults({
		provider: override?.provider ?? current.provider,
		enabled: true,
		host: override?.host ?? current.host,
		port: override?.port ?? current.port,
		secure: override?.secure ?? current.secure,
		username: override?.username ?? current.username,
		password:
			override?.password && override.password.trim()
				? override.password.trim()
				: current.password,
		from_email: override?.from_email ?? current.from_email,
		from_name: override?.from_name ?? current.from_name
	});

	if (!to.trim()) {
		return { ok: false as const, message: 'گیرنده تست را وارد کنید.' };
	}
	if (!merged.host.trim() || !merged.password || !merged.from_email.trim()) {
		return {
			ok: false as const,
			message: 'تنظیمات ناقص است؛ ابتدا ذخیره کنید یا فیلدها را کامل کنید.'
		};
	}

	const transporter = createTransport({
		id: current.id,
		...merged,
		password: merged.password!
	});

	const mail = buildTestMail(to.trim(), merged.from_name || 'azgitwh');

	try {
		await transporter.sendMail({
			from: merged.from_name
				? `"${merged.from_name}" <${merged.from_email}>`
				: merged.from_email,
			to: to.trim(),
			subject: mail.subject,
			text: mail.text,
			html: mail.html
		});
		return { ok: true as const, message: `ایمیل آزمایشی به ${to.trim()} ارسال شد.` };
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return { ok: false as const, message: `ارسال ناموفق: ${detail}` };
	} finally {
		transporter.close();
	}
}

export { GMAIL_PRESET };
