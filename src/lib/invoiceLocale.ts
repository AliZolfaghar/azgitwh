export type InvoiceLocale = 'fa' | 'en';

export type InvoiceCopy = {
	summary: {
		subtotal: string;
		hourly: string;
		totalPrice: string;
		period: string;
		hoursUnit: string;
	};
	table: {
		row: string;
		email: string;
		date: string;
		period: string;
		repos: string;
		commits: string;
		hours: string;
		payment: string;
		messages: string;
		source: string;
		total: string;
		actions: string;
	};
	ui: {
		detailsTitle: string;
		rowsCount: (n: number) => string;
		downloadCsv: string;
		downloadExcel: string;
		regenerate: string;
		regenerateConfirmTitle: string;
		regenerateConfirmText: string;
		deleteInvoice: string;
		backToInvoices: string;
		issuedAt: string;
		currency: string;
		language: string;
		persian: string;
		english: string;
		addItem: string;
		addItemTitle: string;
		saveHours: string;
		editHoursTitle: string;
		deleteManual: string;
		manualBadge: string;
		gitBadge: string;
		cancel: string;
		saveItem: string;
		selectEmail: string;
		otherEmail: string;
		developerShares: string;
		developerSharesTitle: string;
		sharePercent: string;
		rows: string;
		developersCount: (n: number) => string;
		viewDeveloper: string;
		allDevelopers: string;
	};
};

const COPY: Record<InvoiceLocale, InvoiceCopy> = {
	fa: {
		summary: {
			subtotal: 'جمع نفرساعت',
			hourly: 'نرخ یک ساعت',
			totalPrice: 'مبلغ کل',
			period: 'دوره',
			hoursUnit: 'نفرساعت'
		},
		table: {
			row: 'ردیف',
			email: 'ایمیل',
			date: 'تاریخ',
			period: 'دوره',
			repos: 'مخزن/پروژه‌ها',
			commits: 'تعداد کامیت',
			hours: 'نفر ساعت',
			payment: 'پرداخت',
			messages: 'پیام ها (خلاصه)',
			source: 'منبع',
			total: 'جمع کل',
			actions: 'عملیات'
		},
		ui: {
			detailsTitle: 'ریز کارکردهای فاکتور',
			rowsCount: (n) => `${n} ردیف`,
			downloadCsv: 'دانلود CSV',
			downloadExcel: 'دانلود Excel',
			regenerate: 'محاسبه مجدد',
			regenerateConfirmTitle: 'محاسبه مجدد فاکتور؟',
			regenerateConfirmText:
				'ردیف‌های ریپو با پارامترهای فعلی دوباره محاسبه می‌شوند. ردیف‌های دستی می‌مانند، اما ویرایش نفرساعت روی ردیف‌های ریپو بازنویسی می‌شود.',
			deleteInvoice: 'حذف فاکتور',
			backToInvoices: '← بازگشت به فاکتورها',
			issuedAt: 'صادرشده',
			currency: 'ارز',
			language: 'زبان فاکتور',
			persian: 'فارسی',
			english: 'English',
			addItem: 'افزودن آیتم',
			addItemTitle: 'افزودن آیتم دستی',
			saveHours: 'ذخیره',
			editHoursTitle: 'ویرایش نفرساعت',
			deleteManual: 'حذف',
			manualBadge: 'دستی',
			gitBadge: 'ریپو',
			cancel: 'انصراف',
			saveItem: 'افزودن به فاکتور',
			selectEmail: 'انتخاب ایمیل',
			otherEmail: 'ایمیل دیگر…',
			developerShares: 'سهم برنامه‌نویس‌ها',
			developerSharesTitle: 'سهم هر برنامه‌نویس',
			sharePercent: 'سهم',
			rows: 'ردیف',
			developersCount: (n) => `${n} نفر`,
			viewDeveloper: 'مشاهده',
			allDevelopers: '← همه برنامه‌نویس‌ها'
		}
	},
	en: {
		summary: {
			subtotal: 'Subtotal',
			hourly: '1 hour',
			totalPrice: 'Total Price',
			period: 'PERIOD',
			hoursUnit: 'hours'
		},
		table: {
			row: '#',
			email: 'Email',
			date: 'Date',
			period: 'Period',
			repos: 'Repo/Projects',
			commits: 'Commits',
			hours: 'Man-hours',
			payment: 'Payment',
			messages: 'Messages (summary)',
			source: 'Source',
			total: 'Total',
			actions: 'Actions'
		},
		ui: {
			detailsTitle: 'Invoice line items',
			rowsCount: (n) => `${n} rows`,
			downloadCsv: 'Download CSV',
			downloadExcel: 'Download Excel',
			regenerate: 'Regenerate',
			regenerateConfirmTitle: 'Regenerate invoice?',
			regenerateConfirmText:
				'Repo rows will be recalculated with current parameters. Manual rows are kept, but hour edits on repo rows will be overwritten.',
			deleteInvoice: 'Delete invoice',
			backToInvoices: '← Back to invoices',
			issuedAt: 'Issued',
			currency: 'Currency',
			language: 'Invoice language',
			persian: 'فارسی',
			english: 'English',
			addItem: 'Add item',
			addItemTitle: 'Add manual item',
			saveHours: 'Save',
			editHoursTitle: 'Edit man-hours',
			deleteManual: 'Delete',
			manualBadge: 'Manual',
			gitBadge: 'Repo',
			cancel: 'Cancel',
			saveItem: 'Add to invoice',
			selectEmail: 'Select email',
			otherEmail: 'Other email…',
			developerShares: 'Developer shares',
			developerSharesTitle: 'Share per developer',
			sharePercent: 'Share',
			rows: 'Rows',
			developersCount: (n) => `${n} developers`,
			viewDeveloper: 'View',
			allDevelopers: '← All developers'
		}
	}
};

export function normalizeInvoiceLocale(value: unknown): InvoiceLocale {
	return value === 'en' ? 'en' : 'fa';
}

export function getInvoiceCopy(locale: InvoiceLocale): InvoiceCopy {
	return COPY[normalizeInvoiceLocale(locale)];
}

export function formatPeriodCount(months: number, locale: InvoiceLocale = 'fa') {
	if (months <= 0) return '—';
	if (normalizeInvoiceLocale(locale) === 'en') {
		return months === 1 ? '1 month' : `${months} month`;
	}
	return months === 1 ? '1 ماه' : `${months} ماه`;
}

export function sourceLabel(source: string | undefined, locale: InvoiceLocale) {
	const copy = getInvoiceCopy(locale);
	return source === 'manual' ? copy.ui.manualBadge : copy.ui.gitBadge;
}

export function invoiceLinesToCsv(
	lines: Array<{
		row: number;
		email: string;
		date: string;
		period: string;
		repos: string;
		commits: number;
		hours: number;
		payment: number;
		messages: string;
		source?: string;
	}>,
	locale: InvoiceLocale = 'fa'
): string {
	const labels = getInvoiceCopy(locale).table;
	const headers = [
		labels.row,
		labels.source,
		labels.email,
		labels.date,
		labels.period,
		labels.repos,
		labels.commits,
		labels.hours,
		labels.payment,
		labels.messages
	];
	const body = lines.map((line) =>
		[
			line.row,
			sourceLabel(line.source, locale),
			line.email,
			line.date,
			line.period,
			line.repos,
			line.commits,
			line.hours,
			line.payment,
			line.messages
		]
			.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
			.join(',')
	);
	return `\uFEFF${[headers.join(','), ...body].join('\r\n')}\r\n`;
}
