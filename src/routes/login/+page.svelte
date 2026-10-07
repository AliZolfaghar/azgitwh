<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import ThemeToggle from '#lib/components/layout/ThemeToggle.svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const resetDone = $derived(page.url.searchParams.get('reset') === '1');
</script>

<FormAlert {form} />

{#if resetDone}
	<div class="banner banner-ok" style="max-width: 420px; margin: 0 auto 1rem">
		کلمه عبور به‌روزرسانی شد. اکنون وارد شوید.
	</div>
{/if}

<div class="login-page">
	<div class="login-toolbar">
		<ThemeToggle />
	</div>

	<section class="login-card paper">
		<div class="login-brand">
			<div class="sidebar-brand-mark">GTI</div>
			<div>
				<h1>ورود به git to invoice</h1>
				<p class="muted">تخمین نفرساعت از روی تاریخچهٔ Git</p>
			</div>
		</div>

		<form method="POST" class="login-form">
			<input type="hidden" name="from" value={form?.from ?? data.from} />

			<label class="field">
				<span>ایمیل</span>
				<input
					type="text"
					name="email"
					inputmode="email"
					autocomplete="username"
					required
					placeholder="admin@local"
					value={form?.email ?? ''}
				/>
			</label>

			<label class="field">
				<span class="login-password-label">
					<span>کلمه عبور</span>
					<a href="/login/forgot" class="login-forgot">فراموشی رمز؟</a>
				</span>
				<input
					type="password"
					name="password"
					autocomplete="current-password"
					required
					placeholder="••••••••"
				/>
			</label>

			<button type="submit" class="btn-primary">ورود</button>
		</form>

		<p class="muted login-hint">
			کاربر اولیه:
			<span class="kbd">admin@local</span>
			/
			<span class="kbd">admin@1234</span>
		</p>
	</section>
</div>
