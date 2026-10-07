<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let provider = $state<'smtp' | 'gmail'>('smtp');
	let host = $state('');
	let port = $state(587);
	let secure = $state(false);
	let username = $state('');
	let fromEmail = $state('');
	let fromName = $state('');
	let enabled = $state(false);
	let testTo = $state('');
	let password = $state('');
	let syncKey = $state('');
	let testToReady = $state(false);

	const settings = $derived(data.settings);
	const formSnapshot = $derived(form && 'host' in form ? form : null);
	const savedEnabled = $derived(Boolean(settings.enabled));

	function applyFrom(source: {
		provider?: string | null;
		host?: string | null;
		port?: number | string | null;
		secure?: boolean | null;
		username?: string | null;
		from_email?: string | null;
		from_name?: string | null;
		enabled?: boolean | null;
		test_to?: string | null;
	}) {
		provider = source.provider === 'gmail' ? 'gmail' : 'smtp';
		host = String(source.host ?? '');
		port = Number(source.port ?? 587);
		secure = Boolean(source.secure);
		username = String(source.username ?? '');
		fromEmail = String(source.from_email ?? '');
		fromName = String(source.from_name ?? '');
		enabled = Boolean(source.enabled);
		if (source.test_to) testTo = String(source.test_to);
		password = '';
	}

	$effect(() => {
		const key = formSnapshot
			? [
					'form',
					form?.action,
					formSnapshot.provider,
					formSnapshot.host,
					formSnapshot.port,
					formSnapshot.secure,
					formSnapshot.username,
					formSnapshot.from_email,
					formSnapshot.from_name,
					formSnapshot.enabled,
					'test_to' in formSnapshot ? formSnapshot.test_to : ''
				].join('|')
			: [
					'data',
					settings.provider,
					settings.host,
					settings.port,
					settings.secure,
					settings.username,
					settings.from_email,
					settings.from_name,
					settings.enabled,
					settings.hasPassword
				].join('|');

		if (key === syncKey) return;
		syncKey = key;

		if (formSnapshot) applyFrom(formSnapshot);
		else applyFrom(settings);

		if (!testToReady) {
			testTo = data.defaultTestTo;
			testToReady = true;
		}
	});

	function selectSmtp() {
		provider = 'smtp';
		if (!host || host === 'smtp.gmail.com') {
			host = '';
			port = 587;
			secure = false;
		}
	}

	function selectGmail() {
		provider = 'gmail';
		host = 'smtp.gmail.com';
		port = 465;
		secure = true;
	}
</script>

<FormAlert {form} />

<form method="POST" class="mail-page" id="mail-settings-form">
	<input type="hidden" name="provider" value={provider} />
	{#if provider === 'gmail'}
		<input type="hidden" name="host" value={host} />
		<input type="hidden" name="port" value={port} />
		<input type="hidden" name="secure" value="true" />
	{/if}

	<section class="paper mail-status">
		<div class="mail-status-main">
			<div>
				<h2 class="section-title">وضعیت ارسال ایمیل</h2>
				<p class="muted mail-lead">
					اول مشخص کنید ارسال ایمیل در برنامه روشن باشد یا خاموش.
				</p>
			</div>
			<div
				class="mail-status-badge"
				class:is-on={enabled}
				class:is-off={!enabled}
				aria-live="polite"
			>
				{#if enabled}
					<span class="mail-status-dot"></span>
					فعال
				{:else}
					<span class="mail-status-dot"></span>
					غیرفعال
				{/if}
			</div>
		</div>

		<label class="mail-enable">
			<input type="checkbox" name="enabled" bind:checked={enabled} />
			<span>
				<strong>{enabled ? 'ارسال ایمیل روشن است' : 'ارسال ایمیل خاموش است'}</strong>
				<small>
					{#if enabled}
						تنظیمات SMTP یا Gmail را در باکس فعال کامل کنید و ذخیره کنید.
					{:else}
						با روشن کردن، دو روش اتصال کنار هم نمایش داده می‌شود.
					{/if}
				</small>
			</span>
		</label>

		{#if !enabled}
			<div class="mail-status-actions">
				{#if savedEnabled}
					<p class="muted" style="margin: 0">برای اعمال خاموش بودن، وضعیت را ذخیره کنید.</p>
				{/if}
				<button type="submit" formaction="?/save" class="btn-primary">ذخیره وضعیت</button>
			</div>
		{/if}
	</section>

	{#if enabled}
		<section class="mail-providers" aria-label="روش اتصال">
			<!-- SMTP box -->
			<div class="mail-provider" class:is-active={provider === 'smtp'} class:is-idle={provider !== 'smtp'}>
				<button
					type="button"
					class="mail-provider-pick"
					onclick={selectSmtp}
					aria-pressed={provider === 'smtp'}
				>
					<span class="mail-provider-title">SMTP سفارشی</span>
					<span class="mail-provider-desc">سرور ایمیل اختصاصی یا سازمانی</span>
					{#if provider === 'smtp'}
						<span class="mail-provider-tag">انتخاب‌شده</span>
					{:else}
						<span class="mail-provider-tag muted">برای فعال‌سازی کلیک کنید</span>
					{/if}
				</button>

				{#if provider === 'smtp'}
					<div class="mail-provider-body">
						<div class="mail-grid">
							<label class="field mail-span-2">
								<span>میزبان (Host)</span>
								<input
									class="ltr-input"
									type="text"
									name="host"
									required
									bind:value={host}
									placeholder="smtp.example.com"
								/>
							</label>
							<label class="field">
								<span>پورت</span>
								<input
									class="ltr-input"
									type="number"
									name="port"
									required
									min="1"
									max="65535"
									bind:value={port}
								/>
							</label>
							<label class="mail-check field">
								<span class="mail-check-spacer" aria-hidden="true">امن</span>
								<span class="mail-check-control">
									<input type="checkbox" name="secure" bind:checked={secure} />
									<span>SSL / TLS</span>
								</span>
							</label>
							<label class="field">
								<span>نام کاربری</span>
								<input
									class="ltr-input"
									type="text"
									name="username"
									bind:value={username}
									placeholder="smtp-user"
									autocomplete="username"
								/>
							</label>
							<label class="field">
								<span>کلمه عبور</span>
								<input
									class="ltr-input"
									type="password"
									name="password"
									bind:value={password}
									autocomplete="new-password"
									placeholder={settings.hasPassword ? 'بدون تغییر (ذخیره‌شده)' : '••••••••'}
								/>
							</label>
							<label class="field">
								<span>ایمیل From</span>
								<input
									class="ltr-input"
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
								<input
									type="text"
									name="from_name"
									bind:value={fromName}
									placeholder="azgitwh"
								/>
							</label>
						</div>
						<div class="mail-provider-actions">
							<button type="submit" formaction="?/save" class="btn-primary">
								ذخیره تنظیمات SMTP
							</button>
							<button type="submit" formaction="?/test" class="btn-secondary">تست اتصال</button>
						</div>
					</div>
				{:else}
					<div class="mail-provider-idle">
						<p class="muted">این روش غیرفعال است. برای ویرایش، این باکس را انتخاب کنید.</p>
					</div>
				{/if}
			</div>

			<!-- Gmail box -->
			<div class="mail-provider" class:is-active={provider === 'gmail'} class:is-idle={provider !== 'gmail'}>
				<button
					type="button"
					class="mail-provider-pick"
					onclick={selectGmail}
					aria-pressed={provider === 'gmail'}
				>
					<span class="mail-provider-title">Gmail</span>
					<span class="mail-provider-desc">smtp.gmail.com · پورت 465 · SSL</span>
					{#if provider === 'gmail'}
						<span class="mail-provider-tag">انتخاب‌شده</span>
					{:else}
						<span class="mail-provider-tag muted">برای فعال‌سازی کلیک کنید</span>
					{/if}
				</button>

				{#if provider === 'gmail'}
					<div class="mail-provider-body">
						<p class="hint-box">
							از <strong>App Password</strong> استفاده کنید (نه رمز اصلی). تأیید دو مرحله‌ای باید روشن
							باشد.
						</p>
						<div class="mail-grid">
							<label class="field">
								<span>ایمیل Gmail / نام کاربری</span>
								<input
									class="ltr-input"
									type="text"
									name="username"
									bind:value={username}
									placeholder="you@gmail.com"
									autocomplete="username"
								/>
							</label>
							<label class="field">
								<span>App Password</span>
								<input
									class="ltr-input"
									type="password"
									name="password"
									bind:value={password}
									autocomplete="new-password"
									placeholder={settings.hasPassword ? 'بدون تغییر (ذخیره‌شده)' : '••••••••'}
								/>
							</label>
							<label class="field">
								<span>ایمیل From</span>
								<input
									class="ltr-input"
									type="text"
									name="from_email"
									inputmode="email"
									required
									bind:value={fromEmail}
									placeholder="you@gmail.com"
								/>
							</label>
							<label class="field">
								<span>نام فرستنده</span>
								<input
									type="text"
									name="from_name"
									bind:value={fromName}
									placeholder="azgitwh"
								/>
							</label>
						</div>
						<div class="mail-provider-actions">
							<button type="submit" formaction="?/save" class="btn-primary">
								ذخیره تنظیمات Gmail
							</button>
							<button type="submit" formaction="?/test" class="btn-secondary">تست اتصال</button>
						</div>
					</div>
				{:else}
					<div class="mail-provider-idle">
						<p class="muted">این روش غیرفعال است. برای ویرایش، این باکس را انتخاب کنید.</p>
					</div>
				{/if}
			</div>
		</section>

		<section class="paper mail-card mail-card-test">
			<header class="mail-card-head">
				<div>
					<h2 class="section-title">ارسال ایمیل آزمایشی</h2>
					<p class="muted mail-lead">با تنظیمات باکس فعال، یک پیام تست بفرستید.</p>
				</div>
			</header>

			<div class="mail-test-row">
				<label class="field mail-test-field">
					<span>گیرنده</span>
					<input
						class="ltr-input"
						type="text"
						name="test_to"
						inputmode="email"
						bind:value={testTo}
						placeholder="recipient@example.com"
					/>
				</label>
				<button type="submit" formaction="?/sendTest" class="btn-secondary mail-test-btn">
					ارسال تست
				</button>
			</div>
		</section>
	{/if}
</form>
