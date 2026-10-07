import { enhance } from '$app/forms';
import { contentLoading } from '#lib/loading.svelte.js';

const wired = new WeakSet<HTMLFormElement>();

/** Progressive-enhance forms so submissions use client navigation (shows content loader). */
export function wireBusyForms(root: ParentNode): () => void {
	const destructors = new Map<HTMLFormElement, () => void>();

	function wire(form: HTMLFormElement) {
		if (wired.has(form) || form.hasAttribute('data-no-loader')) return;
		wired.add(form);
		// Keep controlled fields intact; drive content loader for long actions (SMTP test, etc.).
		const handle = enhance(form, () => {
			contentLoading.start();
			return async ({ update }) => {
				try {
					await update({ reset: false });
				} finally {
					contentLoading.stop();
				}
			};
		});
		destructors.set(form, () => {
			handle.destroy();
			wired.delete(form);
			destructors.delete(form);
		});
	}

	function unwire(form: HTMLFormElement) {
		destructors.get(form)?.();
	}

	function scan() {
		const live = new Set<HTMLFormElement>();
		root.querySelectorAll('form').forEach((el) => {
			const form = el as HTMLFormElement;
			live.add(form);
			wire(form);
		});
		for (const form of destructors.keys()) {
			if (!live.has(form)) unwire(form);
		}
	}

	const mo = new MutationObserver(scan);
	mo.observe(root, { childList: true, subtree: true });
	scan();

	return () => {
		mo.disconnect();
		for (const dispose of destructors.values()) dispose();
	};
}
