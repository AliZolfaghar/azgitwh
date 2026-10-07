<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Repo = (typeof data.repositories)[number];
	type ModalState =
		| { type: 'create' }
		| { type: 'edit'; repo: Repo }
		| { type: 'delete'; repo: Repo }
		| null;

	let modal = $state<ModalState>(null);
	let createKind = $state<'local' | 'remote'>('local');
	let editKind = $state<'local' | 'remote'>('local');

	$effect(() => {
		if (!form) return;
		if ('success' in form && form.success) {
			modal = null;
			return;
		}
		if (form.action === 'add') modal = { type: 'create' };
		const formId = 'id' in form ? Number((form as { id?: number }).id) : NaN;
		if (form.action === 'update' && Number.isFinite(formId)) {
			const repo = data.repositories.find((item) => item.id === formId);
			if (repo) {
				modal = { type: 'edit', repo };
				editKind = repo.kind;
			}
		}
		if (form.action === 'delete' && Number.isFinite(formId)) {
			const repo = data.repositories.find((item) => item.id === formId);
			if (repo) modal = { type: 'delete', repo };
		}
	});

	function closeModal() {
		modal = null;
	}

	function openCreate() {
		createKind = 'local';
		modal = { type: 'create' };
	}

	function openEdit(repo: Repo) {
		editKind = repo.kind;
		modal = { type: 'edit', repo };
	}
</script>

<p class="page-back">
	<a href="/projects">← بازگشت به پروژه‌ها</a>
</p>

<section class="paper mail-intro">
	<p class="muted" style="margin: 0">
		ارز حساب‌وکتاب:
		<strong>{data.project.currencyLabel}</strong>
		{#if data.project.description}
			· {data.project.description}
		{/if}
	</p>
</section>

<FormAlert {form} />

<section class="paper users-table-wrap">
	<div class="table-toolbar">
		<h2 class="section-title">ریپازیتوری‌های این پروژه</h2>
		<div class="toolbar-actions">
			<span class="muted">{data.repositories.length} مورد</span>
			<button type="button" class="btn-primary" onclick={openCreate}>افزودن ریپازیتوری</button>
		</div>
	</div>

	{#if data.repositories.length === 0}
		<p class="muted" style="margin: 0">هنوز ریپازیتوری‌ای اضافه نشده است.</p>
	{:else}
		<div class="table-scroll">
			<table class="data-table">
				<thead>
					<tr>
						<th style="width: 3.5rem">#</th>
						<th>نام</th>
						<th style="width: 6rem">نوع</th>
						<th>مسیر / آدرس</th>
						<th style="width: 7rem">شاخه</th>
						<th style="width: 5rem">فعال</th>
						<th style="width: 10rem">عملیات</th>
					</tr>
				</thead>
				<tbody>
					{#each data.repositories as repo (repo.id)}
						<tr>
							<td class="mono">{repo.id}</td>
							<td>{repo.name}</td>
							<td>
								<span
									class="kind-badge"
									class:kind-local={repo.kind === 'local'}
									class:kind-remote={repo.kind === 'remote'}
								>
									{repo.kind === 'local' ? 'محلی' : 'آنلاین'}
								</span>
							</td>
							<td class="ltr-input" style="border: 0; padding: 0; background: transparent">
								{repo.location}
							</td>
							<td class="muted">{repo.branch || '—'}</td>
							<td>{repo.enabled ? 'بله' : 'خیر'}</td>
							<td>
								<div class="row-actions">
									<button type="button" class="btn-secondary" onclick={() => openEdit(repo)}>
										ویرایش
									</button>
									<button
										type="button"
										class="btn-danger"
										onclick={() => (modal = { type: 'delete', repo })}
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

<Modal open={modal?.type === 'create'} title="افزودن ریپازیتوری" onclose={closeModal} wide>
	<form id="repo-create-form" method="POST" action="?/add" class="modal-stack">
		<div class="provider-tabs">
			<label class="provider-tab" class:active={createKind === 'local'}>
				<input
					type="radio"
					name="kind"
					value="local"
					checked={createKind === 'local'}
					onchange={() => (createKind = 'local')}
				/>
				<span>محلی</span>
			</label>
			<label class="provider-tab" class:active={createKind === 'remote'}>
				<input
					type="radio"
					name="kind"
					value="remote"
					checked={createKind === 'remote'}
					onchange={() => (createKind = 'remote')}
				/>
				<span>آنلاین</span>
			</label>
		</div>
		<label class="field">
			<span>نام نمایشی</span>
			<input type="text" name="name" maxlength="120" placeholder="اختیاری" />
		</label>
		<label class="field">
			<span>شاخه</span>
			<input type="text" name="branch" placeholder="مثلاً main" />
		</label>
		<label class="field">
			<span>{createKind === 'local' ? 'مسیر فایل‌سیستم' : 'آدرس Git'}</span>
			<input
				type="text"
				name="location"
				required
				class="ltr-input"
				dir="ltr"
				placeholder={createKind === 'local' ? 'D:\\github\\my-repo' : 'https://github.com/org/repo.git'}
			/>
		</label>
		<label class="check-row">
			<input type="checkbox" name="enabled" checked />
			<span>فعال برای گزارش‌گیری</span>
		</label>
	</form>
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="repo-create-form" class="btn-primary">افزودن</button>
	{/snippet}
</Modal>

<Modal open={modal?.type === 'edit'} title="ویرایش ریپازیتوری" onclose={closeModal} wide>
	{#if modal?.type === 'edit'}
		<form id="repo-edit-form" method="POST" action="?/update" class="modal-stack">
			<input type="hidden" name="id" value={modal.repo.id} />
			<div class="provider-tabs">
				<label class="provider-tab" class:active={editKind === 'local'}>
					<input
						type="radio"
						name="kind"
						value="local"
						checked={editKind === 'local'}
						onchange={() => (editKind = 'local')}
					/>
					<span>محلی</span>
				</label>
				<label class="provider-tab" class:active={editKind === 'remote'}>
					<input
						type="radio"
						name="kind"
						value="remote"
						checked={editKind === 'remote'}
						onchange={() => (editKind = 'remote')}
					/>
					<span>آنلاین</span>
				</label>
			</div>
			<label class="field">
				<span>نام نمایشی</span>
				<input type="text" name="name" required maxlength="120" value={modal.repo.name} />
			</label>
			<label class="field">
				<span>شاخه</span>
				<input type="text" name="branch" value={modal.repo.branch} />
			</label>
			<label class="field">
				<span>{editKind === 'local' ? 'مسیر فایل‌سیستم' : 'آدرس Git'}</span>
				<input
					type="text"
					name="location"
					required
					class="ltr-input"
					dir="ltr"
					value={modal.repo.location}
				/>
			</label>
			<label class="check-row">
				<input type="checkbox" name="enabled" checked={modal.repo.enabled} />
				<span>فعال برای گزارش‌گیری</span>
			</label>
		</form>
	{/if}
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="repo-edit-form" class="btn-primary">ذخیره</button>
	{/snippet}
</Modal>

<Modal open={modal?.type === 'delete'} title="حذف ریپازیتوری" onclose={closeModal}>
	{#if modal?.type === 'delete'}
		<p class="muted" style="margin: 0">
			ریپازیتوری <strong>{modal.repo.name}</strong> از این پروژه حذف شود؟
		</p>
		<form id="repo-delete-form" method="POST" action="?/delete">
			<input type="hidden" name="id" value={modal.repo.id} />
		</form>
	{/if}
	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
		<button type="submit" form="repo-delete-form" class="btn-danger">حذف قطعی</button>
	{/snippet}
</Modal>
