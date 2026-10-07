<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const initial = $derived(data.settings);

	let provider = $state<'smtp' | 'gmail'>('smtp');
	let host = $state('');
	let port = $state(587);
	let secure = $state(false);
	let username = $state('');
	let fromEmail = $state('');
	let fromName = $state('');
	let enabled = $state(false);
	let testTo = $state('');
	let hydrated = $state(false);

	$effect(() => {
		if (form && 'host' in form) {
			provider = form.provider === 'gmail' ? 'gmail' : 'smtp';
			host = String(form.host ?? '');
			port = Number(form.port ?? 587);
			secure = Boolean(form.secure);
			username = String(form.username ?? '');
			fromEmail = String(form.from_email ?? '');
			fromName = String(form.from_name ?? '');
			enabled = Boolean(form.enabled);
			if ('test_to' in form && form.test_to) testTo = String(form.test_to);
			return;
		}

		if (!hydrated) {
			provider = initial.provider === 'gmail' ? 'gmail' : 'smtp';
			host = initial.host;
			port = initial.port;
			secure = initial.secure;
			username = initial.username;
			fromEmail = initial.from_email;
			fromName = initial.from_name;
			enabled = initial.enabled;
			testTo = data.defaultTestTo;
			hydrated = true;
		}
	});

	function applyGmailPreset() {
		provider = 'gmail';
		host = 'smtp.gmail.com';
		port = 465;
		secure = true;
	}

	function applySmtpMode() {
		provider = 'smtp';
	}
</script>

<FormAlert {form} />

<section class="paper mail-intro">
	<p class="muted" style="margin: 0">
		اتصال برنامه به سرور ایمیل برای ارسال اعلان‌ها و گزارش‌ها. برای Gmail از
		<strong>App Password</strong> استفاده کنید (نه رمز اصلی حساب).
	</p>
</section>

<form method="POST" class="mail-form" id="mail-settings-form">
	<section class="paper">
		<h2 class="section-title">نوع اتصال</h2>
		<div class="provider-tabs">
			<label class="provider-tab" class:active={provider === 'smtp'}>
				<input
					type="radio"
					name="provider"
					value="smtp"
					checked={provider === 'smtp'}
					onchange={applySmtpMode}
				/>
				<span>SMTP سفارشی</span>
			</label>
			<label class="provider-tab" class:active={provider === 'gmail'}>
				<input
					type="radio"
					name="provider"
					value="gmail"
					checked={provider === 'gmail'}
					onchange={applyGmailPreset}
				/>
				<span>Gmail</span>
			</label>
		</div>

		{#if provider === 'gmail'}
			<p class="muted hint-box">
				پیش‌فرض Gmail: <span class="kbd">smtp.gmail.com</span>، پورت
				<span class="kbd">465</span> (SSL). در حساب Google، تأیید دو مرحله‌ای را روشن کنید و یک
				App Password بسازید.
			</p>
		{/if}

		<label class="check-row">
			<input type="checkbox" name="enabled" checked={enabled} />
			<span>فعال بودن ارسال ایمیل</span>
		</label>
	</section>

	<section class="paper">
		<h2 class="section-title">سرور SMTP</h2>
		<div class="form-grid">
			<label class="field">
				<span>میزبان (Host)</span>
				<input
					type="text"
					name="host"
					required
					bind:value={host}
					readonly={provider === 'gmail'}
					placeholder="smtp.example.com"
				/>
			</label>
			<label class="field">
				<span>پورت</span>
				<input
					type="number"
					name="port"
					required
					min="1"
					max="65535"
					bind:value={port}
					readonly={provider === 'gmail'}
				/>
			</label>
			<label class="check-row field-check">
				<input
					type="checkbox"
					name="secure"
					checked={secure}
					disabled={provider === 'gmail'}
					onchange={(e) => (secure = e.currentTarget.checked)}
				/>
				<span>اتصال امن (SSL/TLS)</span>
			</label>
			{#if provider === 'gmail'}
				<input type="hidden" name="secure" value="true" />
			{/if}
		</div>
	</section>

	<section class="paper">
		<h2 class="section-title">احراز هویت و فرستنده</h2>
		<div class="form-grid">
			<label class="field">
				<span>نام کاربری</span>
				<input
					type="text"
					name="username"
					bind:value={username}
					placeholder={provider === 'gmail' ? 'you@gmail.com' : 'smtp-user'}
					autocomplete="username"
				/>
			</label>
			<label class="field">
				<span>کلمه عبور / App Password</span>
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					placeholder={initial.hasPassword ? 'بدون تغییر (ذخیره‌شده)' : '••••••••'}
				/>
			</label>
			<label class="field">
				<span>ایمیل فرستنده (From)</span>
				<input
					type="text"
					name="from_email"
					inputmode="email"
					required
					bind:value={fromEmail}
					placeholder="noreply@example.com"
				/>
			</label>
			<label class="field">
				<span>نام فرستنده</span>
				<input type="text" name="from_name" bind:value={fromName} placeholder="azgitwh" />
			</label>
		</div>
	</section>

	<section class="paper">
		<h2 class="section-title">عملیات</h2>
		<div class="mail-actions">
			<button type="submit" formaction="?/save" class="btn-primary">ذخیره تنظیمات</button>
			<button type="submit" formaction="?/test" class="btn-secondary">تست اتصال</button>
		</div>

		<div class="test-send">
			<label class="field">
				<span>ارسال ایمیل آزمایشی به</span>
				<input
					type="text"
					name="test_to"
					inputmode="email"
					bind:value={testTo}
					placeholder="recipient@example.com"
				/>
			</label>
			<button type="submit" formaction="?/sendTest" class="btn-secondary">ارسال تست</button>
		</div>
	</section>
</form>
