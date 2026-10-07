export type MailTemplateContent = {
	/** Email subject / visible title */
	title: string;
	/** Preview text in inbox list */
	preheader?: string;
	/** Main heading inside the card */
	heading: string;
	/** Short intro under the heading */
	intro?: string;
	/** HTML body blocks (already escaped or trusted markup) */
	bodyHtml: string;
	/** Optional meta rows shown in a subtle info strip */
	meta?: Array<{ label: string; value: string }>;
	footerNote?: string;
};

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function metaRows(meta: Array<{ label: string; value: string }> | undefined) {
	if (!meta?.length) return '';
	const rows = meta
		.map(
			(item) => `
			<tr>
				<td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 38%; vertical-align: top;">
					${escapeHtml(item.label)}
				</td>
				<td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 600; vertical-align: top; direction: ltr; text-align: left;">
					${escapeHtml(item.value)}
				</td>
			</tr>`
		)
		.join('');

	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 22px; border-collapse: collapse;">
			<tr>
				<td style="padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
						${rows}
					</table>
				</td>
			</tr>
		</table>`;
}

/** Shared HTML shell for all outbound app emails (no admin UI — code-only). */
export function renderMailHtml(content: MailTemplateContent): string {
	const preheader = escapeHtml(content.preheader ?? content.intro ?? content.heading);
	const title = escapeHtml(content.title);
	const heading = escapeHtml(content.heading);
	const intro = content.intro
		? `<p style="margin: 0 0 18px; color: #475569; font-size: 15px; line-height: 1.7;">${escapeHtml(content.intro)}</p>`
		: '';
	const footer = escapeHtml(
		content.footerNote ?? 'این پیام به‌صورت خودکار از سامانه azgitwh ارسال شده است.'
	);
	const year = new Date().getFullYear();

	return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta http-equiv="x-ua-compatible" content="ie=edge" />
	<title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: #eef2f7; -webkit-text-size-adjust: 100%;">
	<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
		${preheader}
	</div>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background: #eef2f7;">
		<tr>
			<td align="center" style="padding: 28px 14px;">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; max-width: 560px; width: 100%;">
					<tr>
						<td style="padding: 0 0 14px;">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
								<tr>
									<td style="vertical-align: middle;">
										<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
											<tr>
												<td style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #1976d2, #1565c0); color: #ffffff; font: 700 13px Tahoma, Arial, sans-serif; text-align: center; vertical-align: middle;">
													AZ
												</td>
												<td style="padding-right: 10px; color: #0f172a; font: 700 18px Tahoma, Arial, sans-serif;">
													azgitwh
												</td>
											</tr>
										</table>
									</td>
									<td align="left" style="color: #94a3b8; font: 12px Tahoma, Arial, sans-serif; direction: ltr; text-align: left;">
										work-hour estimates
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="background: #ffffff; border: 1px solid #dbe3ee; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
								<tr>
									<td style="height: 5px; background: linear-gradient(90deg, #1565c0, #42a5f5); font-size: 0; line-height: 0;">&nbsp;</td>
								</tr>
								<tr>
									<td style="padding: 28px 26px 8px; font-family: Tahoma, Arial, sans-serif;">
										<p style="margin: 0 0 8px; color: #1976d2; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;">
											${title}
										</p>
										<h1 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; line-height: 1.45; font-weight: 700;">
											${heading}
										</h1>
										${intro}
										${metaRows(content.meta)}
										<div style="color: #334155; font-size: 15px; line-height: 1.8;">
											${content.bodyHtml}
										</div>
									</td>
								</tr>
								<tr>
									<td style="padding: 8px 26px 26px; font-family: Tahoma, Arial, sans-serif;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 8px;">
											<tr>
												<td style="padding-top: 18px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
													${footer}
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="padding: 16px 8px 0; text-align: center; color: #94a3b8; font: 11px Tahoma, Arial, sans-serif;">
							© ${year} azgitwh
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

export function renderMailText(content: {
	heading: string;
	intro?: string;
	lines?: string[];
	footerNote?: string;
}): string {
	const parts = [
		content.heading,
		content.intro ?? '',
		...(content.lines ?? []),
		'',
		content.footerNote ?? 'این پیام به‌صورت خودکار از سامانه azgitwh ارسال شده است.'
	].filter((line, index, arr) => line || (index > 0 && arr[index - 1]));

	return parts.join('\n');
}

/** Built-in test message used by mail settings. */
export function buildTestMail(to: string, fromName: string) {
	const heading = 'اتصال ایمیل برقرار است';
	const intro = 'این یک پیام آزمایشی از سامانه azgitwh است. اگر این ایمیل را می‌بینید، تنظیمات SMTP درست کار می‌کند.';
	const bodyHtml = `
		<p style="margin: 0 0 14px;">می‌توانید از همین تنظیمات برای ارسال اعلان‌ها و گزارش‌های بعدی استفاده کنید.</p>
		<p style="margin: 0; padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; color: #1e3a5f; font-size: 14px;">
			نیازی به پاسخ دادن به این پیام نیست.
		</p>`;

	const html = renderMailHtml({
		title: 'آزمایش ایمیل',
		preheader: 'تست موفق اتصال SMTP در azgitwh',
		heading,
		intro,
		meta: [
			{ label: 'گیرنده', value: to },
			{ label: 'فرستنده', value: fromName || 'azgitwh' },
			{
				label: 'زمان',
				value: new Intl.DateTimeFormat('fa-IR', {
					dateStyle: 'medium',
					timeStyle: 'short'
				}).format(new Date())
			}
		],
		bodyHtml,
		footerNote: 'این ایمیل فقط برای آزمایش تنظیمات ارسال شده است.'
	});

	const text = renderMailText({
		heading,
		intro,
		lines: [`گیرنده: ${to}`, `فرستنده: ${fromName || 'azgitwh'}`],
		footerNote: 'این ایمیل فقط برای آزمایش تنظیمات ارسال شده است.'
	});

	return {
		subject: 'آزمایش ایمیل azgitwh',
		html,
		text
	};
}

function actionButton(action: { label: string; url: string } | undefined) {
	if (!action) return '';
	const url = escapeHtml(action.url);
	const label = escapeHtml(action.label);
	return `
		<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 18px 0 8px; border-collapse: collapse;">
			<tr>
				<td style="border-radius: 8px; background: #1565c0;">
					<a href="${url}" style="display: inline-block; padding: 12px 22px; color: #ffffff; font: 700 14px Tahoma, Arial, sans-serif; text-decoration: none;">
						${label}
					</a>
				</td>
			</tr>
		</table>
		<p style="margin: 10px 0 0; color: #64748b; font-size: 12px; line-height: 1.6; direction: ltr; text-align: left; word-break: break-all;">
			${url}
		</p>`;
}

/** Helper for transactional emails — wrap any content in the shared theme. */
export function buildAppMail(input: {
	subject: string;
	heading: string;
	intro?: string;
	paragraphs?: string[];
	meta?: Array<{ label: string; value: string }>;
	action?: { label: string; url: string };
	footerNote?: string;
}) {
	const paragraphs = input.paragraphs ?? [];
	const bodyHtml =
		paragraphs.map((p) => `<p style="margin: 0 0 12px;">${escapeHtml(p)}</p>`).join('') +
		actionButton(input.action);

	return {
		subject: input.subject,
		html: renderMailHtml({
			title: input.subject,
			preheader: input.intro ?? input.heading,
			heading: input.heading,
			intro: input.intro,
			meta: input.meta,
			bodyHtml: bodyHtml || `<p style="margin: 0;">${escapeHtml(input.heading)}</p>`,
			footerNote: input.footerNote
		}),
		text: renderMailText({
			heading: input.heading,
			intro: input.intro,
			lines: [
				...paragraphs,
				...(input.meta ?? []).map((m) => `${m.label}: ${m.value}`),
				...(input.action ? [`${input.action.label}: ${input.action.url}`] : [])
			],
			footerNote: input.footerNote
		})
	};
}

export function buildPasswordResetMail(input: { to: string; resetUrl: string; expiresMinutes: number }) {
	return buildAppMail({
		subject: 'بازیابی کلمه عبور azgitwh',
		heading: 'تنظیم مجدد کلمه عبور',
		intro: 'درخواست بازیابی کلمه عبور برای حساب شما ثبت شد.',
		paragraphs: [
			`اگر این درخواست از سمت شما بوده، روی دکمه زیر بزنید. لینک تا ${input.expiresMinutes} دقیقه معتبر است.`,
			'اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.'
		],
		meta: [{ label: 'حساب', value: input.to }],
		action: { label: 'تغییر کلمه عبور', url: input.resetUrl },
		footerNote: 'این لینک یک‌بارمصرف است و پس از استفاده یا انقضا باطل می‌شود.'
	});
}
