<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Repo = (typeof data.repositories)[number];
	type DevRateDraft = { email: string; hourlyRate: string };
	type ModalState =
		| { type: 'create' }
		| { type: 'edit'; repo: Repo }
		| { type: 'delete'; repo: Repo }
		| { type: 'rates'; repo: Repo }
		| null;

	let modal = $state<ModalState>(null);
	let createKind = $state<'local' | 'remote'>('local');
	let editKind = $state<'local' | 'remote'>('local');
	let rateDrafts = $state<DevRateDraft[]>([]);

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
		if (form.action === 'developerRates' && Number.isFinite(formId)) {
			const repo = data.repositories.find((item) => item.id === formId);
			if (repo) openRates(repo);
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

	function openRates(repo: Repo) {
		rateDrafts =
			repo.developerRates.length > 0
				? repo.developerRates.map((item) => ({
						email: item.email.toLowerCase(),
						hourlyRate: String(item.hourlyRate)
					}))
				: [{ email: '', hourlyRate: '' }];
		modal = { type: 'rates', repo };
	}

	function addRateRow() {
		rateDrafts = [...rateDrafts, { email: '', hourlyRate: '' }];
	}

	function removeRateRow(index: number) {
		rateDrafts = rateDrafts.filter((_, i) => i !== index);
		if (rateDrafts.length === 0) rateDrafts = [{ email: '', hourlyRate: '' }];
	}

	function availableEmails(repo: Repo, rowIndex: number): string[] {
		const selectedElsewhere = new Set(
			rateDrafts
				.map((draft, i) => (i === rowIndex ? '' : draft.email.trim().toLowerCase()))
				.filter(Boolean)
		);
		return repo.authorEmails.filter((email) => !selectedElsewhere.has(email));
	}
</script>

<p class="page-back">
	<a href="/projects">← بازگشت به پروژه‌ها</a>
</p>

<section class="paper mail-intro">
	<p class="muted" style="margin: 0; line-height: 1.8">
		ارز حساب‌وکتاب:
		<strong>{data.project.currencyLabel}</strong>
		· نرخ نفرساعت پروژه:
		<strong class="mono">
			{data.project.hourlyRate != null ? data.project.hourlyRate : '—'}
		</strong>
		{#if data.project.description}
			· {data.project.description}
		{/if}
	</p>
	<p class="muted field-hint" style="margin: 0.55rem 0 0">
		اولویت نرخ: نرخ برنامه‌نویس در ریپو ← نرخ ریپو ← نرخ پروژه
	</p>
</section>

<FormAlert {form} />

<section class="paper users-table-wrap">
	<div class="table-toolbar">
		<h2 class="section-title">ریپازیتوری‌های این پروژه</h2>
		<div class="toolbar-actions">
			<span class="muted">{data.repositories.length} مورد</span>
			<a class="btn-secondary" href="/projects/{data.project.id}/invoice">فاکتور</a>
			{#if data.canManage}
				<button type="button" class="btn-primary" onclick={openCreate}>افزودن ریپازیتوری</button>
			{/if}
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
						<th style="width: 6rem">نرخ</th>
						<th style="width: 6.5rem">فعال</th>
						{#if data.canManage}
							<th style="width: 14rem">عملیات</th>
						{/if}
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
							<td class="ltr-input">{repo.location}</td>
							<td class="muted">{repo.branch || '—'}</td>
							<td class="mono">
								{repo.hourlyRate != null ? repo.hourlyRate : '—'}
								{#if repo.developerRates.length > 0}
									<span class="muted">· {repo.developerRates.length} نفر</span>
								{/if}
							</td>
							<td>
								{#if data.canManage}
									<form method="POST" action="?/toggleEnabled" class="switch-form">
										<input type="hidden" name="id" value={repo.id} />
										<label class="switch" title={repo.enabled ? 'فعال' : 'غیرفعال'}>
											<input
												type="checkbox"
												name="enabled"
												checked={repo.enabled}
												onchange={(event) => event.currentTarget.form?.requestSubmit()}
											/>
											<span class="switch-track" aria-hidden="true">
												<span class="switch-thumb"></span>
											</span>
											<span class="sr-only">{repo.enabled ? 'فعال' : 'غیرفعال'}</span>
										</label>
									</form>
								{:else}
									<span class="muted">{repo.enabled ? 'فعال' : 'غیرفعال'}</span>
								{/if}
							</td>
							{#if data.canManage}
								<td>
									<div class="row-actions">
										<button type="button" class="btn-secondary" onclick={() => openRates(repo)}>
											نرخ‌ها
										</button>
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
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if data.canManage}
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
			<label class="field">
				<span>نرخ نفرساعت ریپو (اختیاری)</span>
				<input class="ltr-input" type="number" name="hourly_rate" min="0" step="any" placeholder="خالی = از پروژه" />
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
				<label class="field">
					<span>نرخ نفرساعت ریپو (اختیاری)</span>
					<input
						class="ltr-input"
						type="number"
						name="hourly_rate"
						min="0"
						step="any"
						placeholder="خالی = از پروژه"
						value={modal.repo.hourlyRate ?? ''}
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

	<Modal
		open={modal?.type === 'rates'}
		title="نرخ نفرساعت برنامه‌نویس‌ها"
		onclose={closeModal}
		wide
	>
		{#if modal?.type === 'rates'}
			<p class="muted" style="margin: 0 0 0.75rem; line-height: 1.7">
				برای ریپوی <strong>{modal.repo.name}</strong> ایمیل‌های نویسنده از Git خوانده می‌شود؛ انتخاب
				کنید و نرخ بگذارید. ردیف بدون نرخ ذخیره نمی‌شود و در آن صورت از نرخ ریپو یا پروژه استفاده
				می‌شود.
			</p>
			{#if modal.repo.authorEmailsError}
				<p class="muted field-hint" style="margin: 0 0 0.75rem; color: var(--danger, #b42318)">
					{modal.repo.authorEmailsError}
				</p>
			{:else if modal.repo.authorEmails.length === 0}
				<p class="muted field-hint" style="margin: 0 0 0.75rem">
					هیچ ایمیل نویسنده‌ای در این ریپو پیدا نشد.
				</p>
			{:else}
				<p class="muted field-hint" style="margin: 0 0 0.75rem">
					{modal.repo.authorEmails.length} ایمیل از تاریخچه Git
				</p>
			{/if}
			<form id="repo-dev-rates-form" method="POST" action="?/developerRates" class="modal-stack">
				<input type="hidden" name="id" value={modal.repo.id} />
				{#each rateDrafts as draft, index (index)}
					{@const emailOptions = availableEmails(modal.repo, index)}
					<div class="dev-rate-row">
						<label class="field">
							<span>ایمیل برنامه‌نویس</span>
							<select class="ltr-input" name="dev_email" bind:value={draft.email} required={Boolean(draft.hourlyRate)}>
								<option value="">انتخاب ایمیل…</option>
								{#each emailOptions as email (email)}
									<option value={email}>{email}</option>
								{/each}
							</select>
						</label>
						<label class="field">
							<span>نرخ نفرساعت</span>
							<input
								class="ltr-input"
								type="number"
								name="dev_rate"
								min="0"
								step="any"
								placeholder="مثلاً 60"
								bind:value={draft.hourlyRate}
							/>
						</label>
						<button
							type="button"
							class="btn-danger btn-compact"
							onclick={() => removeRateRow(index)}
							aria-label="حذف ردیف"
						>
							حذف
						</button>
					</div>
				{/each}
				<button
					type="button"
					class="btn-secondary"
					onclick={addRateRow}
					disabled={modal.repo.authorEmails.length === 0 ||
						rateDrafts.length >= modal.repo.authorEmails.length}
				>
					افزودن ردیف
				</button>
			</form>
		{/if}
		{#snippet footer()}
			<button type="button" class="btn-secondary" onclick={closeModal}>انصراف</button>
			<button type="submit" form="repo-dev-rates-form" class="btn-primary">ذخیره نرخ‌ها</button>
		{/snippet}
	</Modal>
{/if}

<style>
	.dev-rate-row {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr) auto;
		gap: 0.65rem;
		align-items: end;
	}

	@media (max-width: 640px) {
		.dev-rate-row {
			grid-template-columns: 1fr;
		}
	}
</style>
