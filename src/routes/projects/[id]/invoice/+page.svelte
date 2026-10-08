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
	let paramsModalOpen = $state(false);
	let linesPerHourAdd = $state(data.reportParams.linesPerHourAdd);
	let linesPerHourDel = $state(data.reportParams.linesPerHourDel);
	let deleteWeight = $state(data.reportParams.deleteWeight);
	let minWorkTime = $state(data.reportParams.minWorkTime);
	let maxWorkTimeSingle = $state(data.reportParams.maxWorkTimeSingle);
	let maxGapMinutes = $state(data.reportParams.maxGapMinutes);
	let dailyMaxHours = $state(data.reportParams.dailyMaxHours);
	let excludeWww = $state(data.reportParams.excludeWww);
	let paramsSyncKey = $state('');

	const titleValue = $derived(
		form && 'title' in form && form.title != null ? String(form.title) : ''
	);
	const localeValue = $derived(
		form && 'locale' in form && form.locale != null ? String(form.locale) : 'fa'
	);
	const usingProjectParams = $derived(data.reportParamsSource === 'project');

	$effect(() => {
		if (!form) return;
		if ('from' in form && form.from != null) fromValue = String(form.from);
		if ('to' in form && form.to != null) toValue = String(form.to);
		const action = 'action' in form ? form.action : null;
		if (action === 'saveProjectParams' || action === 'clearProjectParams') {
			if ('success' in form && form.success) {
				paramsModalOpen = false;
			} else if (action === 'saveProjectParams') {
				paramsModalOpen = true;
			}
		}
	});

	$effect(() => {
		const snapshot =
			form &&
			'action' in form &&
			form.action === 'saveProjectParams' &&
			'lines_per_hour_add' in form
				? form
				: null;
		const key = snapshot
			? [
					'form',
					snapshot.lines_per_hour_add,
					snapshot.lines_per_hour_del,
					snapshot.delete_weight,
					snapshot.min_work_time,
					snapshot.max_work_time_single,
					snapshot.max_gap_minutes,
					snapshot.daily_max_hours,
					snapshot.exclude_www
				].join('|')
			: [
					'data',
					data.reportParams.linesPerHourAdd,
					data.reportParams.linesPerHourDel,
					data.reportParams.deleteWeight,
					data.reportParams.minWorkTime,
					data.reportParams.maxWorkTimeSingle,
					data.reportParams.maxGapMinutes,
					data.reportParams.dailyMaxHours,
					data.reportParams.excludeWww,
					data.reportParamsSource
				].join('|');

		if (key === paramsSyncKey) return;
		paramsSyncKey = key;

		if (snapshot) {
			linesPerHourAdd = Number(snapshot.lines_per_hour_add);
			linesPerHourDel = Number(snapshot.lines_per_hour_del);
			deleteWeight = Number(snapshot.delete_weight);
			minWorkTime = Number(snapshot.min_work_time);
			maxWorkTimeSingle = Number(snapshot.max_work_time_single);
			maxGapMinutes = Number(snapshot.max_gap_minutes);
			dailyMaxHours = Number(snapshot.daily_max_hours);
			excludeWww = Boolean(snapshot.exclude_www);
			return;
		}

		linesPerHourAdd = data.reportParams.linesPerHourAdd;
		linesPerHourDel = data.reportParams.linesPerHourDel;
		deleteWeight = data.reportParams.deleteWeight;
		minWorkTime = data.reportParams.minWorkTime;
		maxWorkTimeSingle = data.reportParams.maxWorkTimeSingle;
		maxGapMinutes = data.reportParams.maxGapMinutes;
		dailyMaxHours = data.reportParams.dailyMaxHours;
		excludeWww = data.reportParams.excludeWww;
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
					<button
						type="button"
						class="btn-secondary"
						class:is-active={usingProjectParams}
						onclick={() => (paramsModalOpen = true)}
					>
						پارامترها{usingProjectParams ? ' · اختصاصی' : ''}
					</button>
				</div>
			</form>
			<p class="muted field-hint" style="margin: 0.75rem 0 0">
				کارکرد از ریپوهای فعال خوانده می‌شود. پرداخت با اولویت نرخ برنامه‌نویس در ریپو، سپس نرخ ریپو،
				سپس نرخ پروژه محاسبه می‌شود.
				{#if usingProjectParams}
					· این پروژه پارامترهای <strong>اختصاصی</strong> دارد.
				{:else}
					· تخمین نفرساعت فعلاً با <strong>پارامترهای عمومی</strong> انجام می‌شود.
				{/if}
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

			<Modal
				open={paramsModalOpen}
				title="پارامترهای این پروژه"
				onclose={() => (paramsModalOpen = false)}
				wide
			>
				<p class="muted" style="margin: 0 0 0.85rem; line-height: 1.7">
					{#if usingProjectParams}
						مقادیر زیر فقط برای <strong>{data.project.name}</strong> اعمال می‌شوند و پارامترهای
						عمومی را تغییر نمی‌دهند.
					{:else}
						فعلاً از پارامترهای عمومی استفاده می‌شود. با ذخیره، یک نسخهٔ اختصاصی برای این پروژه ساخته
						می‌شود.
						<a href="/params">ویرایش پارامترهای عمومی</a>
					{/if}
				</p>
				<form
					id="project-params-form"
					method="POST"
					action="?/saveProjectParams"
					class="mail-grid params-grid"
				>
					<label class="field">
						<span>خط افزوده‌شده در هر ساعت</span>
						<input
							class="ltr-input"
							type="number"
							name="lines_per_hour_add"
							min="1"
							step="1"
							required
							bind:value={linesPerHourAdd}
						/>
					</label>
					<label class="field">
						<span>خط حذف‌شده در هر ساعت</span>
						<input
							class="ltr-input"
							type="number"
							name="lines_per_hour_del"
							min="1"
							step="1"
							required
							bind:value={linesPerHourDel}
						/>
					</label>
					<label class="field">
						<span>وزن خطوط حذف‌شده</span>
						<input
							class="ltr-input"
							type="number"
							name="delete_weight"
							min="0"
							max="2"
							step="0.05"
							required
							bind:value={deleteWeight}
						/>
					</label>
					<label class="field">
						<span>حداقل زمان هر کامیت (ساعت)</span>
						<input
							class="ltr-input"
							type="number"
							name="min_work_time"
							min="0"
							step="0.05"
							required
							bind:value={minWorkTime}
						/>
					</label>
					<label class="field">
						<span>حداکثر زمان یک کامیت (ساعت)</span>
						<input
							class="ltr-input"
							type="number"
							name="max_work_time_single"
							min="0.05"
							step="0.05"
							required
							bind:value={maxWorkTimeSingle}
						/>
					</label>
					<label class="field">
						<span>فاصلهٔ ادغام سشن (دقیقه)</span>
						<input
							class="ltr-input"
							type="number"
							name="max_gap_minutes"
							min="1"
							step="1"
							required
							bind:value={maxGapMinutes}
						/>
					</label>
					<label class="field">
						<span>سقف ساعت روزانه</span>
						<input
							class="ltr-input"
							type="number"
							name="daily_max_hours"
							min="0.5"
							max="24"
							step="0.5"
							required
							bind:value={dailyMaxHours}
						/>
					</label>
					<div class="field field-toggle">
						<span>حذف مسیرهای www از آمار</span>
						<label class="mail-check-control params-toggle">
							<input type="checkbox" name="exclude_www" bind:checked={excludeWww} />
							<span>{excludeWww ? 'فعال' : 'خاموش'}</span>
						</label>
					</div>
				</form>
				{#snippet footer()}
					{#if usingProjectParams}
						<form method="POST" action="?/clearProjectParams">
							<button type="submit" class="btn-secondary">بازگشت به عمومی</button>
						</form>
					{/if}
					<button type="button" class="btn-secondary" onclick={() => (paramsModalOpen = false)}>
						انصراف
					</button>
					<button type="submit" form="project-params-form" class="btn-primary">
						ذخیره برای این پروژه
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
