import {
	getReportParams,
	parseReportParamsForm,
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
		const input = parseReportParamsForm(await request.formData());

		const result = await saveReportParams(input);
		if (!result.ok) {
			return fail(400, { ...input, message: result.message });
		}

		return { success: true as const, message: result.message, ...input };
	}
};
