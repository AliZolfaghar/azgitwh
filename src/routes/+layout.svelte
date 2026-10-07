<script lang="ts">
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import '#lib/styles/app.css';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const isAuthed = $derived(Boolean(data.user));
	const docTitle = $derived(
		page.data.pageTitle ? `${page.data.pageTitle} · azgitwh` : 'azgitwh'
	);
</script>

<svelte:head>
	<title>{docTitle}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthed && data.user}
	<AppShell userEmail={data.user.email}>
		{@render children()}
	</AppShell>
{:else}
	{@render children()}
{/if}
