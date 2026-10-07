<script lang="ts">
	import { navigating } from '$app/state';
	import { contentLoading } from '#lib/loading.svelte.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const blocked = $derived(navigating.to !== null || contentLoading.busy);
	let play = $state(false);

	// Run fade-up only after loaders clear (e.g. login → dashboard).
	$effect(() => {
		if (blocked) {
			play = false;
			return;
		}
		play = false;
		const id = requestAnimationFrame(() => {
			play = true;
		});
		return () => cancelAnimationFrame(id);
	});
</script>

<div class="page-motion" class:page-motion-in={play}>
	{@render children()}
</div>
