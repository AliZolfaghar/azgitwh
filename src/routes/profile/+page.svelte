<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type ModalState = 'profile' | 'password' | null;
	let modal = $state<ModalState>(null);

	const profile = $derived(data.profile);
	const initial = $derived(
		(profile.displayName || profile.email || '?').trim().charAt(0).toUpperCase()
	);

	$effect(() => {
		if (!form) return;
		if ('success' in form && form.success) {
			modal = null;
			return;
		}
		if (form.action === 'profile') modal = 'profile';
		if (form.action === 'password') modal = 'password';
	});

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

	function closeModal() {
		modal = null;
	}

	const editEmail = $derived(
		form && form.action === 'profile' && 'email' in form
			? String(form.email ?? '')
			: profile.email
	);
	const editName = $derived(
		form && form.action === 'profile' && 'display_name' in form
			? String(form.display_name ?? '')
			: profile.displayName
	);
</script>

<FormAlert {form} />

<section class="paper profile-card">
	<div class="profile-card-head">
		<div class="profile-avatar" aria-hidden="true">{initial}</div>
		<div class="profile-card-titles">
			<h2 class="profile-name">{profile.displayName || 'بدون نام'}</h2>
			<p class="profile-email ltr-input">{profile.email}</p>
		</div>
		<div class="profile-card-actions">
			<button type="button" class="btn-primary" onclick={() => (modal = 'profile')}>
				ویرایش اطلاعات
			</button>
			<button type="button" class="btn-secondary" onclick={() => (modal = 'password')}>
				تغییر کلمه عبور
			</button>
		</div>
	</div>

	<dl class="profile-facts">
		<div class="profile-fact">
			<dt>نام</dt>
			<dd>{profile.displayName || '—'}</dd>
		</div>
		<div class="profile-fact">
			<dt>ایمیل</dt>
			<dd class="ltr-input">{profile.email}</dd>
		</div>
		<div class="profile-fact">
			<dt>شناسه کاربری</dt>
			<dd class="mono">{profile.id}</dd>
		</div>
		<div class="profile-fact">
			<dt>عضویت از</dt>
			<dd>{formatDate(profile.createdAt)}</dd>
		</div>
		<div class="profile-fact">
			<dt>آخرین به‌روزرسانی</dt>
			<dd>{formatDate(profile.updatedAt)}</dd>
		</div>
	</dl>
</section>

<Modal open={modal === 'profile'} title="ویرایش اطلاعات" onclose={closeModal}>
	<form id="profile-edit-form" method="POST" action="?/profile" class="modal-stack">
		<label class="field">
			<span>نام</span>
			<input
				type="text"
				name="display_name"
				required
				maxlength="120"
				autocomplete="name"
				placeholder="مثلاً سجاد"
				value={editName}
			/>
		</label>
		<label class="field">
			<span>ایمیل (نام کاربری)</span>
			<input
				class="ltr-input"
				type="text"
				name="email"
				inputmode="email"
				required
				autocomplete="username"
				value={editEmail}
			/>
		</label>
	</form>
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="profile-edit-form" class="btn-primary">ذخیره</button>
	{/snippet}
</Modal>

<Modal open={modal === 'password'} title="تغییر کلمه عبور" onclose={closeModal}>
	<form id="profile-password-form" method="POST" action="?/password" class="modal-stack">
		<label class="field">
			<span>کلمه عبور فعلی</span>
			<input
				type="password"
				name="current_password"
				required
				autocomplete="current-password"
			/>
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
	</form>
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="profile-password-form" class="btn-primary">تغییر کلمه عبور</button>
	{/snippet}
</Modal>
