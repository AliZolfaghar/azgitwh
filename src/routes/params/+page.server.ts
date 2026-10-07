import {
	getReportParams,
	saveReportParams,
	toPublicParams
} from '#lib/server/reportParams.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const params = toPublicParams(await getReportParams());
	return {
		pageTitle: 'پارامترهای گزارش',
		params
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const input = {
			lines_per_hour_add: Number(form.get('lines_per_hour_add')),
			lines_per_hour_del: Number(form.get('lines_per_hour_del')),
			delete_weight: Number(form.get('delete_weight')),
			min_work_time: Number(form.get('min_work_time')),
			max_work_time_single: Number(form.get('max_work_time_single')),
			max_gap_minutes: Number(form.get('max_gap_minutes')),
			daily_max_hours: Number(form.get('daily_max_hours')),
			exclude_www: form.get('exclude_www') === 'on' || form.get('exclude_www') === 'true'
		};

		const result = await saveReportParams(input);
		if (!result.ok) {
			return fail(400, { ...input, message: result.message });
		}

		return { success: true as const, message: result.message, ...input };
	}
};
