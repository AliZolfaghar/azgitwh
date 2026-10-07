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
</script>

<FormAlert {form} />

{#if data.projects.length === 0}
	<section class="paper empty-project">
		<h2 class="section-title">اولین پروژه را بسازید</h2>
		<p class="muted">
			برای شروع، یک پروژه بسازید و ارز حساب‌وکتاب آن را مشخص کنید. بعد ریپازیتوری‌های Git را به همان
			پروژه وصل می‌کنید.
		</p>
		<button type="button" class="btn-primary" style="margin-top: 1rem" onclick={() => (modal = { type: 'create' })}>
			ساخت پروژه
		</button>
	</section>
{/if}

<section class="paper users-table-wrap">
	<div class="table-toolbar">
		<h2 class="section-title">فهرست پروژه‌ها</h2>
		<div class="toolbar-actions">
			<span class="muted">{data.projects.length} پروژه</span>
			<button type="button" class="btn-primary" onclick={() => (modal = { type: 'create' })}>
				افزودن پروژه
			</button>
		</div>
	</div>

	{#if data.projects.length === 0}
		<p class="muted" style="margin: 0">هنوز پروژه‌ای ثبت نشده است.</p>
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
						<th style="width: 9rem">ایجاد</th>
						<th style="width: 16rem">عملیات</th>
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
							<td class="muted">{formatDate(project.createdAt)}</td>
							<td>
								<div class="row-actions">
									<a class="btn-primary" href="/projects/{project.id}/invoice">فاکتور</a>
									<a class="btn-secondary" href="/projects/{project.id}">ریپوها</a>
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
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

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
