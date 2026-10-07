<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import ThemeToggle from '#lib/components/layout/ThemeToggle.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<FormAlert {form} />

<div class="login-page">
	<div class="login-toolbar">
		<ThemeToggle />
	</div>

	<section class="login-card paper">
		<div class="login-brand">
			<div class="sidebar-brand-mark">AZ</div>
			<div>
				<h1>ورود به azgitwh</h1>
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
				<span>کلمه عبور</span>
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
