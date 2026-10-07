<script lang="ts">
	import { showToast } from '#lib/toastr.js';

	interface Props {
		form?: {
			message?: string;
			success?: boolean;
			action?: string;
		} | null;
	}

	let { form = null }: Props = $props();

	let lastKey = $state('');

	$effect(() => {
		const message = form?.message;
		if (!message) return;

		const success = Boolean(form && 'success' in form && form.success);
		const key = `${form?.action ?? ''}:${success}:${message}`;
		if (key === lastKey) return;
		lastKey = key;

		void showToast(message, success ? 'success' : 'error');
	});
</script>
