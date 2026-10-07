<script lang="ts">
	import { page } from '$app/state';
	import ContentBusy from '#lib/components/ContentBusy.svelte';
	import { wireBusyForms } from '#lib/wireBusyForms.js';
	import type { Snippet } from 'svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import {
		iconClock,
		iconDashboard,
		iconDatabase,
		iconFolder,
		iconLogout,
		iconMail,
		iconMenu,
		iconSettings,
		iconUser,
		iconUsers
	} from './icons.js';

	interface Props {
		userEmail: string;
		children: Snippet;
	}

	let { userEmail, children }: Props = $props();

	let shellEl = $state<HTMLDivElement | undefined>();
	let sidebarOpen = $state(true);
	let mobileOpen = $state(false);

	$effect(() => {
		if (!shellEl) return;
		return wireBusyForms(shellEl);
	});

	type NavItem = {
		href: string;
		label: string;
		icon: string;
		disabled?: boolean;
	};

	const navItems: NavItem[] = [
		{ href: '/', label: 'داشبورد', icon: iconDashboard },
		{ href: '/projects', label: 'پروژه‌ها', icon: iconFolder },
		{ href: '#params', label: 'پارامترها', icon: iconSettings, disabled: true },
		{ href: '/users', label: 'کاربران', icon: iconUsers },
		{ href: '/mail', label: 'ایمیل', icon: iconMail },
		{ href: '/profile', label: 'پروفایل من', icon: iconUser }
	];

	function toggleSidebar() {
		if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
			mobileOpen = !mobileOpen;
			return;
		}
		sidebarOpen = !sidebarOpen;
	}

	function closeMobile() {
		mobileOpen = false;
	}

	const pageTitle = $derived(
		page.data.pageTitle ??
			navItems.find((item) => !item.disabled && item.href === page.url.pathname)?.label ??
			'azgitwh'
	);
</script>

{#if mobileOpen}
	<button type="button" class="sidebar-backdrop" aria-label="بستن منو" onclick={closeMobile}
	></button>
{/if}

<div class="app-shell" bind:this={shellEl}>
	<aside
		class="sidebar"
		class:mini={!sidebarOpen}
		class:mobile-open={mobileOpen}
		aria-label="منوی اصلی"
	>
		<div class="sidebar-brand">
			<div class="sidebar-brand-mark">AZ</div>
			{#if sidebarOpen || mobileOpen}
				<span class="sidebar-brand-text">azgitwh</span>
			{/if}
		</div>

		<div class="nav-search">
			<input type="search" placeholder="جستجو…" aria-label="جستجو در منو" disabled />
		</div>

		<ul class="nav-list">
			<li class="nav-group">MAIN</li>
			{#each navItems as item}
				<li class="nav-item">
					{#if item.disabled}
						<button type="button" class="nav-link" disabled title="به‌زودی">
							<span class="nav-icon">{@html item.icon}</span>
							<span class="nav-label">{item.label}</span>
						</button>
					{:else}
						<a
							href={item.href}
							class:active={page.url.pathname === item.href}
							onclick={closeMobile}
						>
							<span class="nav-icon">{@html item.icon}</span>
							<span class="nav-label">{item.label}</span>
						</a>
					{/if}
				</li>
			{/each}

			<li class="nav-group">STATUS</li>
			<li class="nav-item">
				<button type="button" class="nav-link" disabled>
					<span class="nav-icon">{@html iconDatabase}</span>
					<span class="nav-label">SQLite آماده</span>
				</button>
			</li>
			<li class="nav-item">
				<button type="button" class="nav-link" disabled>
					<span class="nav-icon">{@html iconClock}</span>
					<span class="nav-label">گام‌به‌گام</span>
				</button>
			</li>
		</ul>
	</aside>

	<div class="main-column" class:mini={!sidebarOpen}>
		<header class="app-header">
			<button type="button" class="icon-btn" aria-label="باز/بسته کردن منو" onclick={toggleSidebar}>
				{@html iconMenu}
			</button>
			<h1 class="header-title">{pageTitle}</h1>
			<span class="header-spacer"></span>
			<a class="header-user" href="/profile" title="پروفایل من">{userEmail}</a>
			<ThemeToggle />
			<form method="POST" action="/logout">
				<button type="submit" class="icon-btn" aria-label="خروج" title="خروج">
					{@html iconLogout}
				</button>
			</form>
		</header>

		<main class="content">
			<ContentBusy captureForms={false}>
				{@render children()}
			</ContentBusy>
		</main>
	</div>
</div>
