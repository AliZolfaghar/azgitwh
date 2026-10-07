<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Project = (typeof data.projects)[number];
	type ModalState =
		| { type: 'create' }
		| { type: 'edit'; project: Project }
		| { type: 'delete'; project: Project }
		| { type: 'members'; project: Project }
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
			const project = data.projects.find((item) => item.id === formId);
			if (project) modal = { type: 'edit', project };
		}
		if (form.action === 'delete' && Number.isFinite(formId)) {
			const project = data.projects.find((item) => item.id === formId);
			if (project) modal = { type: 'delete', project };
		}
		if (form.action === 'members' && Number.isFinite(formId)) {
			const project = data.projects.find((item) => item.id === formId);
			if (project) modal = { type: 'members', project };
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
</script>

<FormAlert {form} />

{#if data.projects.length === 0}
	<section class="paper empty-project">
		{#if data.isAdmin}
			<h2 class="section-title">اولین پروژه را بسازید</h2>
			<p class="muted">
				برای شروع، یک پروژه بسازید و ارز حساب‌وکتاب آن را مشخص کنید. بعد ریپازیتوری‌های Git را به همان
				پروژه وصل می‌کنید و کاربرانی که باید پروژه را ببینند اضافه کنید.
			</p>
			<button
				type="button"
				class="btn-primary"
				style="margin-top: 1rem"
				onclick={() => (modal = { type: 'create' })}
			>
				ساخت پروژه
			</button>
		{:else}
			<h2 class="section-title">پروژه‌ای برای شما تعریف نشده</h2>
			<p class="muted">
				هنوز به هیچ پروژه‌ای دسترسی ندارید. از ادمین بخواهید شما را به پروژه اضافه کند.
			</p>
		{/if}
	</section>
{/if}

<section class="paper users-table-wrap">
	<div class="table-toolbar">
		<h2 class="section-title">فهرست پروژه‌ها</h2>
		<div class="toolbar-actions">
			<span class="muted">{data.projects.length} پروژه</span>
			{#if data.isAdmin}
				<button type="button" class="btn-primary" onclick={() => (modal = { type: 'create' })}>
					افزودن پروژه
				</button>
			{/if}
		</div>
	</div>

	{#if data.projects.length === 0}
		<p class="muted" style="margin: 0">هنوز پروژه‌ای برای نمایش نیست.</p>
	{:else}
		<div class="table-scroll">
			<table class="data-table">
				<thead>
					<tr>
						<th style="width: 4rem">شناسه</th>
						<th>نام</th>
						<th style="width: 10rem">ارز</th>
						<th>توضیحات</th>
						<th style="width: 5rem">ریپوها</th>
						{#if data.isAdmin}
							<th style="width: 5rem">اعضا</th>
						{/if}
						<th style="width: 9rem">ایجاد</th>
						<th style="width: 18rem">عملیات</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project (project.id)}
						<tr>
							<td class="mono">{project.id}</td>
							<td>{project.name}</td>
							<td>{project.currencyLabel}</td>
							<td class="muted">{project.description || '—'}</td>
							<td class="mono">{project.repoCount}</td>
							{#if data.isAdmin}
								<td class="mono">{project.memberCount}</td>
							{/if}
							<td class="muted">{formatDate(project.createdAt)}</td>
							<td>
								<div class="row-actions">
									<a class="btn-primary" href="/projects/{project.id}/invoice">فاکتور</a>
									<a class="btn-secondary" href="/projects/{project.id}">ریپوها</a>
									{#if data.isAdmin}
										<button
											type="button"
											class="btn-secondary"
											onclick={() => (modal = { type: 'members', project })}
										>
											اعضا
										</button>
										<button
											type="button"
											class="btn-secondary"
											onclick={() => (modal = { type: 'edit', project })}
										>
											ویرایش
										</button>
										<button
											type="button"
											class="btn-danger"
											onclick={() => (modal = { type: 'delete', project })}
										>
											حذف
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if data.isAdmin}
	<Modal open={modal?.type === 'create'} title="افزودن پروژه" onclose={closeModal} wide>
		<form id="project-create-form" method="POST" action="?/create" class="modal-stack">
			<label class="field">
				<span>نام پروژه</span>
				<input type="text" name="name" required maxlength="120" placeholder="مثلاً Nalaris Resto" />
			</label>
			<label class="field">
				<span>ارز حساب‌وکتاب</span>
				<select name="currency_code" required>
					{#each data.currencies as currency}
						<option value={currency.code} selected={currency.code === 'USD'}>{currency.label}</option>
					{/each}
				</select>
			</label>
			<label class="field">
				<span>توضیحات</span>
				<input type="text" name="description" maxlength="500" placeholder="اختیاری" />
			</label>
		</form>
		{#snippet footer()}
			<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
			<button type="submit" form="project-create-form" class="btn-primary">ذخیره</button>
		{/snippet}
	</Modal>

	<Modal open={modal?.type === 'edit'} title="ویرایش پروژه" onclose={closeModal} wide>
		{#if modal?.type === 'edit'}
			<form id="project-edit-form" method="POST" action="?/update" class="modal-stack">
				<input type="hidden" name="id" value={modal.project.id} />
				<label class="field">
					<span>نام پروژه</span>
					<input type="text" name="name" required maxlength="120" value={modal.project.name} />
				</label>
				<label class="field">
					<span>ارز حساب‌وکتاب</span>
					<select name="currency_code" required>
						{#each data.currencies as currency}
							<option value={currency.code} selected={currency.code === modal.project.currencyCode}>
								{currency.label}
							</option>
						{/each}
					</select>
				</label>
				<label class="field">
					<span>توضیحات</span>
					<input type="text" name="description" maxlength="500" value={modal.project.description} />
				</label>
			</form>
		{/if}
		{#snippet footer()}
			<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
			<button type="submit" form="project-edit-form" class="btn-primary">ذخیره تغییرات</button>
		{/snippet}
	</Modal>

	<Modal open={modal?.type === 'delete'} title="حذف پروژه" onclose={closeModal}>
		{#if modal?.type === 'delete'}
			<p class="muted" style="margin: 0">
				پروژه <strong>{modal.project.name}</strong> و ریپازیتوری‌هایش حذف می‌شوند. این کار قابل بازگشت
				نیست.
			</p>
			<form id="project-delete-form" method="POST" action="?/delete">
				<input type="hidden" name="id" value={modal.project.id} />
			</form>
		{/if}
		{#snippet footer()}
			<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
			<button type="submit" form="project-delete-form" class="btn-danger">حذف قطعی</button>
		{/snippet}
	</Modal>

	<Modal open={modal?.type === 'members'} title="کاربران دارای دسترسی" onclose={closeModal} wide>
		{#if modal?.type === 'members'}
			<p class="muted" style="margin: 0 0 0.75rem; line-height: 1.7">
				کاربرانی که تیک می‌خورند می‌توانند پروژه
				<strong>{modal.project.name}</strong>
				را در فهرست پروژه‌ها ببینند و وارد آن شوند.
			</p>
			<form id="project-members-form" method="POST" action="?/members" class="modal-stack">
				<input type="hidden" name="id" value={modal.project.id} />
				{#if data.allUsers.length === 0}
					<p class="muted" style="margin: 0">هنوز کاربری ثبت نشده است.</p>
				{:else}
					<div class="member-picker">
						{#each data.allUsers as user (user.id)}
							<label class="field-check member-row">
								<input
									type="checkbox"
									name="user_ids"
									value={user.id}
									checked={modal.project.memberIds.includes(user.id)}
								/>
								<span>
									<strong>{user.displayName}</strong>
									<span class="muted ltr-input">{user.email}</span>
								</span>
							</label>
						{/each}
					</div>
				{/if}
			</form>
		{/if}
		{#snippet footer()}
			<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
			<button type="submit" form="project-members-form" class="btn-primary">ذخیره دسترسی</button>
		{/snippet}
	</Modal>
{/if}

<style>
	.member-picker {
		display: grid;
		gap: 0.35rem;
		max-height: min(50vh, 22rem);
		overflow: auto;
		padding: 0.15rem;
	}

	.member-row {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		margin: 0;
		cursor: pointer;
	}

	.member-row input {
		margin-top: 0.2rem;
		accent-color: var(--color-primary);
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.member-row span {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		line-height: 1.35;
	}

	.member-row strong {
		font-weight: 600;
	}
</style>
