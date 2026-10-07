<script lang="ts">
	import { navigating, page } from '$app/state';
	import { contentLoading } from '#lib/loading.svelte.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let play = $state(false);
	let animatedPath = $state<string | null>(null);

	const routeKey = $derived(`${page.url.pathname}${page.url.search}`);
	const leavingRoute = $derived(
		navigating.to != null &&
			`${navigating.to.url.pathname}${navigating.to.url.search}` !== routeKey
	);

	// Fade-up only when the route actually changes — not on in-place form refreshes.
	$effect(() => {
		if (leavingRoute) {
			play = false;
			return;
		}

		if (contentLoading.busy) {
			return;
		}

		if (animatedPath === routeKey) {
			play = true;
			return;
		}

		animatedPath = routeKey;
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
