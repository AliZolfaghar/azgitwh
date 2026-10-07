<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function formatDate(value: string) {
		try {
			return new Intl.DateTimeFormat('fa-IR', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value));
		} catch {
			return value;
		}
	}
</script>

<FormAlert {form} />

<section class="paper mail-intro">
	<p class="muted" style="margin: 0">
		اطلاعات حساب خود را مدیریت کنید. بعداً می‌توان فیلدهای بیشتری به این صفحه اضافه کرد.
	</p>
</section>

<section class="paper profile-section">
	<h2 class="section-title">اطلاعات کاربری</h2>
	<form method="POST" action="?/profile" class="form-grid profile-form">
		<label class="field">
			<span>ایمیل (نام کاربری)</span>
			<input
				type="text"
				name="email"
				inputmode="email"
				required
				autocomplete="username"
				value={data.profile.email}
			/>
		</label>
		<label class="field">
			<span>نام نمایشی</span>
			<input
				type="text"
				name="display_name"
				maxlength="120"
				placeholder="مثلاً سجاد"
				value={data.profile.displayName}
			/>
		</label>
		<div class="field field-meta">
			<span class="muted">عضویت از {formatDate(data.profile.createdAt)}</span>
		</div>
		<div class="profile-actions">
			<button type="submit" class="btn-primary">ذخیره اطلاعات</button>
		</div>
	</form>
</section>

<section class="paper profile-section">
	<h2 class="section-title">تغییر کلمه عبور</h2>
	<form method="POST" action="?/password" class="form-grid profile-form">
		<label class="field">
			<span>کلمه عبور فعلی</span>
			<input type="password" name="current_password" required autocomplete="current-password" />
		</label>
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
		<div class="profile-actions">
			<button type="submit" class="btn-primary">تغییر کلمه عبور</button>
		</div>
	</form>
</section>
