<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import FormAlert from '#lib/components/FormAlert.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import {
		formatPeriodCount,
		getInvoiceCopy,
		invoiceLinesToCsv,
		normalizeInvoiceLocale,
		type InvoiceLocale
	} from '#lib/invoiceLocale.js';
	import { confirmAction } from '#lib/swal.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const invoice = $derived(data.invoice);
	let locale = $state<InvoiceLocale>('fa');
	let addOpen = $state(false);
	let hoursEdit = $state<{
		lineId: string;
		email: string;
		date: string;
		hours: string;
	} | null>(null);
	let hoursInputEl = $state<HTMLInputElement | null>(null);
	let emailChoice = $state('');
	let customEmail = $state('');
	let sharesOpen = $state(false);
	let selectedShareEmail = $state<string | null>(null);

	const invoiceEmails = $derived(
		[...new Set(invoice.lines.map((line) => line.email).filter(Boolean))].sort((a, b) =>
			a.localeCompare(b)
		)
	);
	const selectedEmail = $derived(emailChoice === '__other__' ? customEmail.trim() : emailChoice);

	$effect(() => {
		locale = normalizeInvoiceLocale(data.invoice.locale);
	});

	$effect(() => {
		if (!form) return;
		if (form.action === 'addItem' && 'success' in form && form.success) {
			addOpen = false;
			emailChoice = '';
			customEmail = '';
			return;
		}
		if (form.action === 'addItem' && form.message && !('success' in form && form.success)) {
			addOpen = true;
			const failedEmail =
				'email' in form && form.email != null ? String(form.email) : '';
			if (failedEmail) {
				const known = invoiceEmails.includes(failedEmail);
				emailChoice = known ? failedEmail : '__other__';
				customEmail = known ? '' : failedEmail;
			}
		}
		if (form.action === 'updateHours') {
			if ('success' in form && form.success) {
				hoursEdit = null;
				return;
			}
			if (form.message && !('success' in form && form.success)) {
				const lineId =
					'line_id' in form && form.line_id != null ? String(form.line_id) : '';
				const hours =
					'hours' in form && form.hours != null ? String(form.hours) : '';
				const line = invoice.lines.find((item) => item.id === lineId);
				if (line) {
					hoursEdit = {
						lineId: line.id,
						email: line.email,
						date: line.date,
						hours: hours || String(line.hours)
					};
				}
			}
		}
	});

	$effect(() => {
		if (hoursEdit && hoursInputEl) {
			hoursInputEl.focus();
			hoursInputEl.select();
		}
	});

	function startEditHours(line: (typeof invoice.lines)[number]) {
		hoursEdit = {
			lineId: line.id,
			email: line.email,
			date: line.date,
			hours: String(line.hours)
		};
	}

	function closeHoursEdit() {
		hoursEdit = null;
	}

	function restoreScroll(y: number) {
		const apply = () => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
		apply();
		requestAnimationFrame(() => {
			apply();
			requestAnimationFrame(apply);
		});
	}

	const enhanceHoursEdit: SubmitFunction = () => {
		const scrollY = window.scrollY;
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') hoursEdit = null;
			restoreScroll(scrollY);
		};
	};

	const copy = $derived(getInvoiceCopy(locale));
	const periodLabel = $derived(formatPeriodCount(invoice.periodMonths, locale));
	const periodsText = $derived(invoice.periods.length ? invoice.periods.join(' , ') : '—');
	const dir = $derived(locale === 'en' ? 'ltr' : 'rtl');

	const addDate = $derived(
		form && form.action === 'addItem' && 'date' in form ? String(form.date ?? '') : ''
	);
	const addRepos = $derived(
		form && form.action === 'addItem' && 'repos' in form ? String(form.repos ?? '') : ''
	);
	const addCommits = $derived(
		form && form.action === 'addItem' && 'commits' in form ? String(form.commits ?? '') : ''
	);
	const addHours = $derived(
		form && form.action === 'addItem' && 'hours' in form ? String(form.hours ?? '') : ''
	);
	const addMessages = $derived(
		form && form.action === 'addItem' && 'messages' in form ? String(form.messages ?? '') : ''
	);

	function downloadCsv() {
		const csv = invoiceLinesToCsv(invoice.lines, locale);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `invoice_${data.project.id}_${invoice.id}_${locale}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function downloadExcel() {
		const href = `/projects/${data.project.id}/invoice/${invoice.id}/excel?locale=${locale}`;
		const response = await fetch(href);
		if (!response.ok) return;

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `invoice_${data.project.id}_${invoice.id}_${locale}.xlsx`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function onRegenerateSubmit(event: SubmitEvent) {
		event.preventDefault();
		const confirmed = await confirmAction({
			title: copy.ui.regenerateConfirmTitle,
			text: copy.ui.regenerateConfirmText,
			confirmText: copy.ui.regenerate,
			cancelText: copy.ui.cancel
		});
		if (!confirmed) return;
		(event.currentTarget as HTMLFormElement).submit();
	}

	function formatDate(value: string) {
		try {
			return new Intl.DateTimeFormat(locale === 'en' ? 'en-CA' : 'fa-IR', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value));
		} catch {
			return value;
		}
	}

	function formatNumber(value: number, digits = 2) {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: digits,
			minimumFractionDigits: 0
		}).format(value);
	}

	const tableTotals = $derived(
		invoice.lines.reduce(
			(acc, line) => ({
				commits: acc.commits + line.commits,
				hours: acc.hours + line.hours,
				payment: acc.payment + line.payment
			}),
			{ commits: 0, hours: 0, payment: 0 }
		)
	);

	const developerShares = $derived.by(() => {
		const map = new Map<
			string,
			{ email: string; rows: number; commits: number; hours: number; payment: number }
		>();

		for (const line of invoice.lines) {
			const current = map.get(line.email) ?? {
				email: line.email,
				rows: 0,
				commits: 0,
				hours: 0,
				payment: 0
			};
			current.rows += 1;
			current.commits += line.commits;
			current.hours += line.hours;
			current.payment += line.payment;
			map.set(line.email, current);
		}

		const totalHours = tableTotals.hours || 0;
		const totalPayment = tableTotals.payment || 0;

		return [...map.values()]
			.map((item) => ({
				...item,
				hours: Number(item.hours.toFixed(2)),
				payment: Number(item.payment.toFixed(2)),
				hoursShare: totalHours > 0 ? (item.hours / totalHours) * 100 : 0,
				paymentShare: totalPayment > 0 ? (item.payment / totalPayment) * 100 : 0
			}))
			.sort((a, b) => b.hours - a.hours || a.email.localeCompare(b.email));
	});

	const selectedShare = $derived(
		selectedShareEmail
			? developerShares.find((item) => item.email === selectedShareEmail) ?? null
			: null
	);

	const selectedShareLines = $derived(
		selectedShareEmail
			? invoice.lines.filter((line) => line.email === selectedShareEmail)
			: []
	);

	function openShares() {
		selectedShareEmail = null;
		sharesOpen = true;
	}

	function closeShares() {
		sharesOpen = false;
		selectedShareEmail = null;
	}
</script>

<p class="page-back">
	<a href="/projects/{data.project.id}/invoice">{copy.ui.backToInvoices}</a>
</p>

<FormAlert {form} />

<section class="paper mail-card invoice-sheet" data-invoice-lang={locale} dir={dir}>
	<header class="mail-card-head">
		<div>
			<h2 class="section-title">{invoice.title}</h2>
			<p class="muted mail-lead">
				{invoice.projectName}
				· {copy.ui.currency}: {invoice.currencyLabel}
				· {copy.ui.issuedAt}: {formatDate(invoice.createdAt)}
			</p>
		</div>
		<div class="report-detail-actions">
			<div class="invoice-lang-switch" role="group" aria-label={copy.ui.language}>
				<form method="POST" action="?/setLocale">
					<input type="hidden" name="locale" value="fa" />
					<button type="submit" class="btn-secondary" class:is-active={locale === 'fa'}>
						فارسی
					</button>
				</form>
				<form method="POST" action="?/setLocale">
					<input type="hidden" name="locale" value="en" />
					<button type="submit" class="btn-secondary" class:is-active={locale === 'en'}>
						English
					</button>
				</form>
			</div>
			<form method="POST" action="?/regenerate" onsubmit={onRegenerateSubmit}>
				<button type="submit" class="btn-primary">{copy.ui.regenerate}</button>
			</form>
			<button type="button" class="btn-secondary" onclick={openShares}>
				{copy.ui.developerShares}
			</button>
			<button type="button" class="btn-secondary" onclick={downloadCsv}>{copy.ui.downloadCsv}</button>
			<button type="button" class="btn-secondary" onclick={downloadExcel}>
				{copy.ui.downloadExcel}
			</button>
			<form method="POST" action="?/delete">
				<button type="submit" class="btn-danger">{copy.ui.deleteInvoice}</button>
			</form>
		</div>
	</header>

	<div class="invoice-summary-wrap">
		<table class="invoice-summary-table">
			<tbody>
				<tr>
					<th scope="row">{copy.summary.subtotal}</th>
					<td class="mono ltr-input">{formatNumber(invoice.totalHours)}</td>
					<td class="muted">{copy.summary.hoursUnit}</td>
				</tr>
				<tr>
					<th scope="row">{copy.summary.hourly}</th>
					<td class="mono ltr-input">
						<strong>{invoice.hourlyRate > 0 ? formatNumber(invoice.hourlyRate) : '—'}</strong>
					</td>
					<td class="mono">{invoice.currencyCode}</td>
				</tr>
				<tr>
					<th scope="row">{copy.summary.totalPrice}</th>
					<td class="mono ltr-input">
						{invoice.totalPayment > 0 ? formatNumber(invoice.totalPayment, 3) : '—'}
					</td>
					<td class="mono">{invoice.currencyCode}</td>
				</tr>
				<tr>
					<th scope="row">{copy.summary.period}</th>
					<td class="mono ltr-input"><strong>{periodLabel}</strong></td>
					<td class="mono muted">{periodsText}</td>
				</tr>
			</tbody>
		</table>
	</div>
</section>

<section
	class="paper users-table-wrap invoice-sheet"
	style="margin-top: 1rem"
	data-invoice-lang={locale}
	dir={dir}
>
	<div class="table-toolbar">
		<h2 class="section-title">{copy.ui.detailsTitle}</h2>
		<div class="toolbar-actions">
			<span class="muted">{copy.ui.rowsCount(invoice.lines.length)}</span>
			<button
				type="button"
				class="btn-primary"
				onclick={() => {
					emailChoice = invoiceEmails[0] ?? '__other__';
					customEmail = '';
					addOpen = true;
				}}
			>
				{copy.ui.addItem}
			</button>
		</div>
	</div>
	<div class="table-scroll">
		<table class="data-table">
			<thead>
				<tr>
					<th>{copy.table.row}</th>
					<th>{copy.table.source}</th>
					<th>{copy.table.email}</th>
					<th class="cell-nowrap">{copy.table.date}</th>
					<th class="cell-nowrap">{copy.table.period}</th>
					<th>{copy.table.repos}</th>
					<th>{copy.table.commits}</th>
					<th>{copy.table.hours}</th>
					<th>{copy.table.payment}</th>
					<th>{copy.table.messages}</th>
					<th>{copy.table.actions}</th>
				</tr>
			</thead>
			<tbody>
				{#each invoice.lines as line (line.id)}
					<tr
						class:invoice-line-manual={line.source === 'manual'}
						class:invoice-line-edited={line.hoursEdited}
					>
						<td class="mono">{line.row}</td>
						<td>
							<span
								class="invoice-source-badge"
								class:is-manual={line.source === 'manual'}
								class:is-git={line.source !== 'manual'}
								class:is-edited={line.hoursEdited}
							>
								{line.hoursEdited
									? copy.ui.editedBadge
									: line.source === 'manual'
										? copy.ui.manualBadge
										: copy.ui.gitBadge}
							</span>
						</td>
						<td class="ltr-input">{line.email}</td>
						<td class="mono cell-nowrap">{line.date}</td>
						<td class="mono cell-nowrap">{line.period}</td>
						<td class="muted">{line.repos || '—'}</td>
						<td class="mono">{line.commits || '—'}</td>
						<td class="invoice-hours-cell">
							<button
								type="button"
								class="invoice-hours-value mono"
								title={locale === 'en' ? 'Double-click to edit' : 'برای ویرایش دوبار کلیک کنید'}
								ondblclick={() => startEditHours(line)}
							>
								{formatNumber(line.hours)}
							</button>
						</td>
						<td class="mono">
							{line.payment > 0 ? formatNumber(line.payment) : '—'}
						</td>
						<td class="muted">{line.messages || '—'}</td>
						<td>
							{#if line.source === 'manual'}
								<form method="POST" action="?/deleteLine">
									<input type="hidden" name="line_id" value={line.id} />
									<button type="submit" class="btn-danger btn-compact">{copy.ui.deleteManual}</button>
								</form>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="report-total-row">
					<td colspan="6"><strong>{copy.table.total}</strong></td>
					<td class="mono"><strong>{tableTotals.commits}</strong></td>
					<td class="mono"><strong>{formatNumber(tableTotals.hours)}</strong></td>
					<td class="mono">
						<strong>
							{tableTotals.payment > 0 ? formatNumber(tableTotals.payment) : '—'}
						</strong>
					</td>
					<td colspan="2"></td>
				</tr>
			</tfoot>
		</table>
	</div>
</section>

<Modal
	open={addOpen}
	title={copy.ui.addItemTitle}
	onclose={() => {
		addOpen = false;
		emailChoice = '';
		customEmail = '';
	}}
	wide
>
	<form method="POST" action="?/addItem" class="form-grid" id="add-invoice-item-form">
		<label class="field">
			<span>{copy.table.email}</span>
			<select
				class="ltr-input"
				bind:value={emailChoice}
				required={emailChoice !== '__other__'}
				aria-label={copy.ui.selectEmail}
			>
				<option value="" disabled>{copy.ui.selectEmail}</option>
				{#each invoiceEmails as email (email)}
					<option value={email}>{email}</option>
				{/each}
				<option value="__other__">{copy.ui.otherEmail}</option>
			</select>
			<input type="hidden" name="email" value={selectedEmail} />
		</label>
		{#if emailChoice === '__other__'}
			<label class="field">
				<span>{copy.ui.otherEmail}</span>
				<input
					class="ltr-input"
					type="email"
					bind:value={customEmail}
					required
					placeholder="name@example.com"
				/>
			</label>
		{/if}
		<label class="field">
			<span>{copy.table.date}</span>
			<input class="ltr-input" type="date" name="date" required value={addDate} />
		</label>
		<label class="field">
			<span>{copy.table.hours}</span>
			<input
				class="ltr-input"
				type="number"
				name="hours"
				min="0"
				step="any"
				required
				value={addHours}
			/>
		</label>
		<label class="field">
			<span>{copy.table.commits}</span>
			<input
				class="ltr-input"
				type="number"
				name="commits"
				min="0"
				step="1"
				value={addCommits}
			/>
		</label>
		<label class="field" style="grid-column: 1 / -1">
			<span>{copy.table.repos}</span>
			<input type="text" name="repos" maxlength="240" value={addRepos} />
		</label>
		<label class="field" style="grid-column: 1 / -1">
			<span>{copy.table.messages}</span>
			<textarea name="messages" rows="3" maxlength="2000">{addMessages}</textarea>
		</label>
	</form>

	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={() => (addOpen = false)}>
			{copy.ui.cancel}
		</button>
		<button type="submit" class="btn-primary" form="add-invoice-item-form">
			{copy.ui.saveItem}
		</button>
	{/snippet}
</Modal>

<Modal
	open={hoursEdit != null}
	title={copy.ui.editHoursTitle}
	onclose={closeHoursEdit}
>
	{#if hoursEdit}
		<form
			method="POST"
			action="?/updateHours"
			class="modal-stack"
			id="edit-hours-form"
			data-no-loader
			use:enhance={enhanceHoursEdit}
		>
			<input type="hidden" name="line_id" value={hoursEdit.lineId} />
			<p class="muted" style="margin: 0">
				<span class="ltr-input">{hoursEdit.email}</span>
				·
				<span class="mono">{hoursEdit.date}</span>
			</p>
			<label class="field">
				<span>{copy.table.hours}</span>
				<input
					bind:this={hoursInputEl}
					class="ltr-input"
					type="number"
					name="hours"
					min="0"
					step="any"
					required
					bind:value={hoursEdit.hours}
				/>
			</label>
		</form>
	{/if}

	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeHoursEdit}>
			{copy.ui.cancel}
		</button>
		<button type="submit" class="btn-primary" form="edit-hours-form">
			{copy.ui.saveHours}
		</button>
	{/snippet}
</Modal>

<Modal open={sharesOpen} title={copy.ui.developerSharesTitle} onclose={closeShares} wide>
	<div class="invoice-shares" dir={dir}>
		{#if selectedShare}
			<div class="invoice-shares-detail">
				<button type="button" class="btn-secondary btn-compact" onclick={() => (selectedShareEmail = null)}>
					{copy.ui.allDevelopers}
				</button>
				<div class="invoice-shares-hero">
					<strong class="ltr-input">{selectedShare.email}</strong>
					<div class="report-stats" style="margin-top: 0.75rem">
						<div class="report-stat">
							<span class="muted">{copy.table.hours}</span>
							<strong>{formatNumber(selectedShare.hours)}</strong>
						</div>
						<div class="report-stat">
							<span class="muted">{copy.table.payment}</span>
							<strong>
								{selectedShare.payment > 0
									? `${formatNumber(selectedShare.payment)} ${invoice.currencyCode}`
									: '—'}
							</strong>
						</div>
						<div class="report-stat">
							<span class="muted">{copy.ui.sharePercent}</span>
							<strong>{formatNumber(selectedShare.hoursShare, 1)}%</strong>
						</div>
						<div class="report-stat">
							<span class="muted">{copy.ui.rows}</span>
							<strong>{selectedShare.rows}</strong>
						</div>
					</div>
				</div>

				<div class="table-scroll" style="margin-top: 1rem">
					<table class="data-table">
						<thead>
							<tr>
								<th class="cell-nowrap">{copy.table.date}</th>
								<th class="cell-nowrap">{copy.table.period}</th>
								<th>{copy.table.repos}</th>
								<th>{copy.table.commits}</th>
								<th>{copy.table.hours}</th>
								<th>{copy.table.payment}</th>
								<th>{copy.table.messages}</th>
							</tr>
						</thead>
						<tbody>
							{#each selectedShareLines as line (line.id)}
								<tr
									class:invoice-line-manual={line.source === 'manual'}
									class:invoice-line-edited={line.hoursEdited}
								>
									<td class="mono cell-nowrap">{line.date}</td>
									<td class="mono cell-nowrap">{line.period}</td>
									<td class="muted">{line.repos || '—'}</td>
									<td class="mono">{line.commits || '—'}</td>
									<td class="mono">{formatNumber(line.hours)}</td>
									<td class="mono">
										{line.payment > 0 ? formatNumber(line.payment) : '—'}
									</td>
									<td class="muted">{line.messages || '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="table-toolbar" style="margin-bottom: 0.75rem">
				<span class="muted">{copy.ui.developersCount(developerShares.length)}</span>
			</div>
			<div class="table-scroll">
				<table class="data-table">
					<thead>
						<tr>
							<th>{copy.table.email}</th>
							<th>{copy.ui.rows}</th>
							<th>{copy.table.commits}</th>
							<th>{copy.table.hours}</th>
							<th>{copy.ui.sharePercent}</th>
							<th>{copy.table.payment}</th>
							<th>{copy.table.actions}</th>
						</tr>
					</thead>
					<tbody>
						{#each developerShares as share (share.email)}
							<tr>
								<td class="ltr-input">{share.email}</td>
								<td class="mono">{share.rows}</td>
								<td class="mono">{share.commits}</td>
								<td class="mono">{formatNumber(share.hours)}</td>
								<td class="mono">{formatNumber(share.hoursShare, 1)}%</td>
								<td class="mono">
									{share.payment > 0
										? `${formatNumber(share.payment)} ${invoice.currencyCode}`
										: '—'}
								</td>
								<td>
									<button
										type="button"
										class="btn-secondary btn-compact"
										onclick={() => (selectedShareEmail = share.email)}
									>
										{copy.ui.viewDeveloper}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<button type="button" class="btn-secondary" onclick={closeShares}>
			{copy.ui.cancel}
		</button>
	{/snippet}
</Modal>
