<script lang="ts">
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import ContentBusy from '#lib/components/ContentBusy.svelte';
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import { fadeUpFast } from '#lib/motion.js';
	import '#lib/styles/app.css';
	import { fly } from 'svelte/transition';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const isAuthed = $derived(Boolean(data.user));
	const docTitle = $derived(
		page.data.pageTitle ? `${page.data.pageTitle} · azgitwh` : 'azgitwh'
	);
	const pageKey = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>{docTitle}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthed && data.user}
	<AppShell userEmail={data.user.email} userName={data.user.displayName}>
		{#key pageKey}
			<div class="page-motion" in:fly={fadeUpFast}>
				{@render children()}
			</div>
		{/key}
	</AppShell>
{:else}
	<div class="auth-shell">
		<ContentBusy>
			{#key pageKey}
				<div class="page-motion" in:fly={fadeUpFast}>
					{@render children()}
				</div>
			{/key}
		</ContentBusy>
	</div>
{/if}
