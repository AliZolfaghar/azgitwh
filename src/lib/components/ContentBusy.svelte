<script lang="ts">
	import { navigating } from '$app/state';
	import { contentLoading } from '#lib/loading.svelte.js';
	import { wireBusyForms } from '#lib/wireBusyForms.js';
	import { fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Delay before showing loader to avoid flicker on fast ops. */
		delayMs?: number;
		/** Progressive-enhance descendant forms (disable if a parent already wires them). */
		captureForms?: boolean;
	}

	// Short delay so quick saves don't flash; long SMTP tests still show the overlay promptly.
	let { children, delayMs = 80, captureForms = true }: Props = $props();

	let root = $state<HTMLDivElement | undefined>();
	let visible = $state(false);

	// In SvelteKit 3, `navigating` is always an object; idle means `.to` / `.type` are null.
	const pending = $derived(navigating.to !== null || contentLoading.busy);

	$effect(() => {
		if (!root || !captureForms) return;
		return wireBusyForms(root);
	});

	$effect(() => {
		if (pending) {
			const timer = setTimeout(() => {
				visible = true;
			}, delayMs);
			return () => clearTimeout(timer);
		}
		visible = false;
	});
</script>

<div class="content-busy" bind:this={root} aria-busy={visible}>
	{@render children()}

	{#if visible}
		<div
			class="content-loader"
			transition:fade={{ duration: 120 }}
			role="status"
			aria-live="polite"
			aria-label="در حال بارگذاری"
		>
			<div class="content-loader-spinner" aria-hidden="true"></div>
			<span class="content-loader-label">در حال بارگذاری…</span>
		</div>
	{/if}
</div>
