<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import MonthRangePicker from '#lib/components/MonthRangePicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const MONTHS = [
		'ژانویه',
		'فوریه',
		'مارس',
		'آوریل',
		'مه',
		'ژوئن',
		'ژوئیه',
		'اوت',
		'سپتامبر',
		'اکتبر',
		'نوامبر',
		'دسامبر'
	] as const;

	let fromValue = $state(
		form && 'from' in form && form.from != null ? String(form.from) : data.defaultFrom
	);
	let toValue = $state(
		form && 'to' in form && form.to != null ? String(form.to) : data.defaultTo
	);
	let rangeModalOpen = $state(false);
	const titleValue = $derived(
		form && 'title' in form && form.title != null ? String(form.title) : ''
	);
	const localeValue = $derived(
		form && 'locale' in form && form.locale != null ? String(form.locale) : 'fa'
	);

	$effect(() => {
		if (!form) return;
		if ('from' in form && form.from != null) fromValue = String(form.from);
		if ('to' in form && form.to != null) toValue = String(form.to);
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

	function rangeLabel(from: string, to: string) {
		if (!from && !to) return '—';
		return from === to ? from : `${from} تا ${to}`;
	}

	function labelYm(value: string) {
		const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
		if (!match) return value || '—';
		const month = Number(match[2]);
		if (month < 1 || month > 12) return value;
		return `${MONTHS[month - 1]} ${match[1]}`;
	}

	function rangeDisplay(from: string, to: string) {
		if (!from && !to) return 'انتخاب بازه ماه';
		if (from === to) return labelYm(from);
		return `${labelYm(from)} تا ${labelYm(to)}`;
	}

	function formatMoney(value: number) {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 2
		}).format(value);
	}
</script>

<p class="page-back">
	<a href="/projects">← پروژه‌ها</a>
	<span class="muted">·</span>
	<a href="/projects/{data.project.id}">ریپوها</a>
</p>

<FormAlert {form} />

<section class="paper mail-card">
	<header class="mail-card-head">
		<div>
			<h2 class="section-title">فاکتورهای {data.project.name}</h2>
			<p class="muted mail-lead">
				ارز پروژه: <strong>{data.project.currencyLabel}</strong>
				· نرخ پروژه:
				<strong class="mono">
					{data.project.hourlyRate != null ? data.project.hourlyRate : '—'}
				</strong>
				· ریپوهای فعال: {data.enabledCount}
				({data.localEnabledCount} محلی)
			</p>
		</div>
	</header>

	{#if data.canManage}
		{#if data.localEnabledCount === 0}
			<p class="muted" style="margin: 0">
				برای صدور فاکتور حداقل یک ریپازیتوری <strong>محلی و فعال</strong> لازم است.
			</p>
		{:else}
			<form method="POST" action="?/create" class="invoice-issue-form">
				<input type="hidden" name="from" value={fromValue} required />
				<input type="hidden" name="to" value={toValue} required />
				<label class="field">
					<span>عنوان فاکتور (اختیاری)</span>
					<input
						type="text"
						name="title"
						maxlength="160"
						placeholder="مثلاً فاکتور سه‌ماهه اول"
						value={titleValue}
					/>
				</label>
				<div class="field">
					<span>بازه فاکتور</span>
					<button
						type="button"
						class="btn-secondary invoice-range-trigger"
						onclick={() => (rangeModalOpen = true)}
					>
						<span class="invoice-range-trigger-text">{rangeDisplay(fromValue, toValue)}</span>
						<span class="muted mono invoice-range-trigger-code"
							>{rangeLabel(fromValue, toValue)}</span
						>
					</button>
				</div>
				<label class="field">
					<span>زبان</span>
					<select name="locale" value={localeValue}>
						<option value="fa">فارسی</option>
						<option value="en">English</option>
					</select>
				</label>
				<div class="report-create-actions">
					<button type="submit" class="btn-primary">صدور فاکتور</button>
					<a class="btn-secondary" href="/params">پارامترها</a>
				</div>
			</form>
			<p class="muted field-hint" style="margin: 0.75rem 0 0">
				کارکرد از ریپوهای فعال خوانده می‌شود. پرداخت با اولویت نرخ برنامه‌نویس در ریپو، سپس نرخ ریپو،
				سپس نرخ پروژه محاسبه می‌شود.
			</p>

			<Modal
				open={rangeModalOpen}
				title="انتخاب بازه ماه"
				onclose={() => (rangeModalOpen = false)}
			>
				<MonthRangePicker
					bind:from={fromValue}
					bind:to={toValue}
					label="بازه فاکتور"
					includeInputs={false}
				/>
				{#snippet footer()}
					<button type="button" class="btn-primary" onclick={() => (rangeModalOpen = false)}>
						تأیید بازه
					</button>
				{/snippet}
			</Modal>
		{/if}
	{:else}
		<p class="muted" style="margin: 0; line-height: 1.8">
			دسترسی شما فقط برای <strong>مشاهده</strong> فاکتورهای این پروژه است. صدور یا ویرایش توسط ادمین یا
			اوپراتور انجام می‌شود.
		</p>
	{/if}
</section>

<section class="paper users-table-wrap" style="margin-top: 1rem">
	<div class="table-toolbar">
		<h2 class="section-title">فاکتورهای صادرشده</h2>
		<span class="muted">{data.invoices.length} مورد</span>
	</div>

	{#if data.invoices.length === 0}
		<p class="muted" style="margin: 0">هنوز فاکتوری برای این پروژه صادر نشده است.</p>
	{:else}
		<div class="table-scroll">
			<table class="data-table">
				<thead>
					<tr>
						<th style="width: 4rem">#</th>
						<th>عنوان</th>
						<th>زبان</th>
						<th>بازه</th>
						<th>نفرساعت</th>
						<th>پرداخت</th>
						<th>تاریخ</th>
						<th style="width: 8rem">عملیات</th>
					</tr>
				</thead>
				<tbody>
					{#each data.invoices as item (item.id)}
						<tr>
							<td class="mono">{item.id}</td>
							<td>{item.title}</td>
							<td class="muted">{item.locale === 'en' ? 'EN' : 'FA'}</td>
							<td class="mono">{rangeLabel(item.periodFrom, item.periodTo)}</td>
							<td class="mono">{item.totalHours.toFixed(2)}</td>
							<td class="mono">
								{item.totalPayment > 0
									? `${formatMoney(item.totalPayment)} ${item.currencyCode}`
									: '—'}
							</td>
							<td class="muted">{formatDate(item.createdAt)}</td>
							<td>
								<a class="btn-secondary" href="/projects/{data.project.id}/invoice/{item.id}">
									مشاهده
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
