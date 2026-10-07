<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import ThemeToggle from '#lib/components/layout/ThemeToggle.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<FormAlert {form} />

<div class="login-page">
	<div class="login-toolbar">
		<ThemeToggle />
	</div>

	<section class="login-card paper">
		<div class="login-brand">
			<div class="sidebar-brand-mark">GTI</div>
			<div>
				<h1>بازیابی کلمه عبور</h1>
				<p class="muted">لینک تغییر رمز به ایمیل شما ارسال می‌شود.</p>
			</div>
		</div>

		{#if form && 'success' in form && form.success}
			<p class="muted" style="margin: 0; line-height: 1.7">{form.message}</p>
			<p class="login-links">
				<a href="/login">بازگشت به ورود</a>
			</p>
		{:else}
			<form method="POST" class="login-form">
				<label class="field">
					<span>ایمیل حساب</span>
					<input
						type="text"
						name="email"
						inputmode="email"
						autocomplete="username"
						required
						placeholder="you@example.com"
						value={form && 'email' in form ? String(form.email ?? '') : ''}
					/>
				</label>
				<button type="submit" class="btn-primary">ارسال لینک بازیابی</button>
			</form>

			<p class="login-links">
				<a href="/login">بازگشت به ورود</a>
			</p>
		{/if}
	</section>
</div>
