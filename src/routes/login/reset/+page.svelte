<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import ThemeToggle from '#lib/components/layout/ThemeToggle.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const token = $derived(form && 'token' in form ? String(form.token ?? '') : data.token);
	const showForm = $derived(Boolean(token) && (data.valid || (form && !('success' in form))));
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
				<h1>کلمه عبور جدید</h1>
				<p class="muted">رمز جدید حساب خود را وارد کنید.</p>
			</div>
		</div>

		{#if !token || (!data.valid && !form)}
			<p class="muted" style="margin: 0; line-height: 1.7">
				{data.message ?? 'لینک بازیابی نامعتبر است.'}
			</p>
			<p class="login-links">
				<a href="/login/forgot">درخواست لینک تازه</a>
				<a href="/login">ورود</a>
			</p>
		{:else if showForm}
			<form method="POST" class="login-form">
				<input type="hidden" name="token" value={token} />
				<label class="field">
					<span>کلمه عبور جدید</span>
					<input
						type="password"
						name="new_password"
						required
						minlength="6"
						autocomplete="new-password"
					/>
				</label>
				<label class="field">
					<span>تکرار کلمه عبور جدید</span>
					<input
						type="password"
						name="confirm_password"
						required
						minlength="6"
						autocomplete="new-password"
					/>
				</label>
				<button type="submit" class="btn-primary">ذخیره کلمه عبور</button>
			</form>
			<p class="login-links">
				<a href="/login">بازگشت به ورود</a>
			</p>
		{/if}
	</section>
</div>
