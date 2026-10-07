<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type User = (typeof data.users)[number];
	type ModalState =
		| { type: 'create' }
		| { type: 'edit'; user: User }
		| { type: 'delete'; user: User }
		| null;

	let modal = $state<ModalState>(null);

	$effect(() => {
		if (!form) return;
		if ('success' in form && form.success) {
			modal = null;
			return;
		}
		if (form.action === 'create') modal = { type: 'create' };
		const formId = 'id' in form ? Number(form.id) : NaN;
		if (form.action === 'update' && Number.isFinite(formId)) {
			const user = data.users.find((item) => item.id === formId);
			if (user) modal = { type: 'edit', user };
		}
		if (form.action === 'delete' && Number.isFinite(formId)) {
			const user = data.users.find((item) => item.id === formId);
			if (user) modal = { type: 'delete', user };
		}
	});

	function formatDate(value: string) {
		if (!value) return '—';
		const date = /^\d{10,}$/.test(value) ? new Date(Number(value)) : new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('fa-IR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	function closeModal() {
		modal = null;
	}

	function formRole(fallback: string) {
		if (form && 'role' in form && form.role != null) return String(form.role);
		return fallback;
	}
</script>

<FormAlert {form} />

<section class="paper users-table-wrap">
	<div class="table-toolbar">
		<h2 class="section-title">کاربران</h2>
		<div class="toolbar-actions">
			<span class="muted">{data.users.length} نفر</span>
			<button type="button" class="btn-primary" onclick={() => (modal = { type: 'create' })}>
				افزودن کاربر
			</button>
		</div>
	</div>

	<div class="table-scroll">
		<table class="data-table">
			<thead>
				<tr>
					<th style="width: 4rem">شناسه</th>
					<th>نام</th>
					<th>ایمیل</th>
					<th style="width: 6rem">نقش</th>
					<th style="width: 9rem">ایجاد</th>
					<th style="width: 10rem">عملیات</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as user (user.id)}
					<tr>
						<td class="mono">{user.id}</td>
						<td>{user.displayName || '—'}</td>
						<td class="muted">{user.email}</td>
						<td>
							<span class="role-badge" class:role-admin={user.role === 'admin'}>
								{user.roleLabel}
							</span>
						</td>
						<td class="muted">{formatDate(user.createdAt)}</td>
						<td>
							<div class="row-actions">
								<button
									type="button"
									class="btn-secondary"
									onclick={() => (modal = { type: 'edit', user })}
								>
									ویرایش
								</button>
								<button
									type="button"
									class="btn-danger"
									disabled={!user.canDelete}
									title={user.canDelete ? 'حذف' : 'غیرقابل حذف'}
									onclick={() => (modal = { type: 'delete', user })}
								>
									حذف
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<Modal open={modal?.type === 'create'} title="افزودن کاربر" onclose={closeModal}>
	<form id="user-create-form" method="POST" action="?/create" class="modal-stack">
		<label class="field">
			<span>نام</span>
			<input
				type="text"
				name="display_name"
				required
				maxlength="120"
				autocomplete="name"
				placeholder="مثلاً سجاد"
				value={form && 'display_name' in form ? String(form.display_name ?? '') : ''}
			/>
		</label>
		<label class="field">
			<span>ایمیل</span>
			<input
				type="text"
				name="email"
				inputmode="email"
				required
				autocomplete="off"
				placeholder="user@example.com"
				value={form && form.action === 'create' && 'email' in form ? String(form.email ?? '') : ''}
			/>
		</label>
		<label class="field">
			<span>سطح دسترسی</span>
			<select name="role" value={formRole('user')}>
				<option value="user">{data.roleLabels.user}</option>
				<option value="admin">{data.roleLabels.admin}</option>
			</select>
		</label>
		<label class="field">
			<span>کلمه عبور</span>
			<input type="password" name="password" required autocomplete="new-password" minlength="6" />
		</label>
	</form>
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="user-create-form" class="btn-primary">افزودن</button>
	{/snippet}
</Modal>

<Modal open={modal?.type === 'edit'} title="ویرایش کاربر" onclose={closeModal}>
	{#if modal?.type === 'edit'}
		<form id="user-edit-form" method="POST" action="?/update" class="modal-stack">
			<input type="hidden" name="id" value={modal.user.id} />
			<label class="field">
				<span>نام</span>
				<input
					type="text"
					name="display_name"
					required
					maxlength="120"
					autocomplete="name"
					value={
						form && form.action === 'update' && 'display_name' in form
							? String(form.display_name ?? '')
							: modal.user.displayName
					}
				/>
			</label>
			<label class="field">
				<span>ایمیل</span>
				<input
					type="text"
					name="email"
					inputmode="email"
					required
					value={
						form && form.action === 'update' && 'email' in form
							? String(form.email ?? '')
							: modal.user.email
					}
				/>
			</label>
			<label class="field">
				<span>سطح دسترسی</span>
				<select name="role" value={formRole(modal.user.role)}>
					<option value="user">{data.roleLabels.user}</option>
					<option value="admin">{data.roleLabels.admin}</option>
				</select>
			</label>
			<label class="field">
				<span>کلمه عبور جدید</span>
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					minlength="6"
					placeholder="خالی = بدون تغییر"
				/>
			</label>
		</form>
	{/if}
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="user-edit-form" class="btn-primary">ذخیره</button>
	{/snippet}
</Modal>

<Modal open={modal?.type === 'delete'} title="حذف کاربر" onclose={closeModal}>
	{#if modal?.type === 'delete'}
		<p class="muted" style="margin: 0">
			کاربر
			<strong>{modal.user.displayName || modal.user.email}</strong>
			({modal.user.email}) حذف شود؟
		</p>
		<form id="user-delete-form" method="POST" action="?/delete">
			<input type="hidden" name="id" value={modal.user.id} />
		</form>
	{/if}
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="user-delete-form" class="btn-danger">حذف قطعی</button>
	{/snippet}
</Modal>

<style>
	.role-badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		font-size: 0.8rem;
		background: color-mix(in srgb, var(--color-border) 65%, transparent);
		color: var(--color-text-muted, inherit);
	}

	.role-badge.role-admin {
		background: color-mix(in srgb, var(--color-primary) 18%, transparent);
		color: var(--color-primary);
		font-weight: 600;
	}
</style>
