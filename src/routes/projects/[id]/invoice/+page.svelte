<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const fromValue = $derived(
		form && 'from' in form && form.from != null ? String(form.from) : data.defaultFrom
	);
	const toValue = $derived(
		form && 'to' in form && form.to != null ? String(form.to) : data.defaultTo
	);
	const titleValue = $derived(
		form && 'title' in form && form.title != null ? String(form.title) : ''
	);
	const hourlyRateValue = $derived(
		form && 'hourly_rate' in form && form.hourly_rate != null ? String(form.hourly_rate) : ''
	);
	const localeValue = $derived(
		form && 'locale' in form && form.locale != null ? String(form.locale) : 'fa'
	);

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
				<label class="field">
					<span>از ماه</span>
					<input class="ltr-input" type="month" name="from" required value={fromValue} />
				</label>
				<label class="field">
					<span>تا ماه</span>
					<input class="ltr-input" type="month" name="to" required value={toValue} />
				</label>
				<label class="field">
					<span>نرخ ساعتی ({data.project.currencyCode})</span>
					<input
						class="ltr-input"
						type="number"
						name="hourly_rate"
						min="0"
						step="any"
						placeholder="اختیاری"
						value={hourlyRateValue}
					/>
				</label>
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
				کارکرد از ریپوهای فعال خوانده می‌شود و مستقیم به‌صورت فاکتور ذخیره می‌گردد.
			</p>
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
