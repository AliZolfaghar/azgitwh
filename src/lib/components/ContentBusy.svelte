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

	let { children, delayMs = 100, captureForms = true }: Props = $props();

	let root = $state<HTMLDivElement | undefined>();
	let visible = $state(false);

	const pending = $derived(Boolean(navigating) || contentLoading.busy);

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
