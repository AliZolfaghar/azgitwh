<script lang="ts">
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import ContentBusy from '#lib/components/ContentBusy.svelte';
	import PageMotion from '#lib/components/PageMotion.svelte';
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import '#lib/styles/app.css';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const isAuthed = $derived(Boolean(data.user));
	const docTitle = $derived(
		page.data.pageTitle ? `${page.data.pageTitle} · git to invoice` : 'git to invoice'
	);
	/** Remount on route change and after login/logout so enter motion restarts. */
	const pageKey = $derived(`${isAuthed ? 'in' : 'out'}:${page.url.pathname}`);
</script>

<svelte:head>
	<title>{docTitle}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthed && data.user}
	<AppShell userEmail={data.user.email} userName={data.user.displayName}>
		{#key pageKey}
			<PageMotion>
				{@render children()}
			</PageMotion>
		{/key}
	</AppShell>
{:else}
	<div class="auth-shell">
		<ContentBusy>
			{#key pageKey}
				<PageMotion>
					{@render children()}
				</PageMotion>
			{/key}
		</ContentBusy>
	</div>
{/if}
