<script lang="ts">
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

	interface Props {
		from?: string;
		to?: string;
		nameFrom?: string;
		nameTo?: string;
		required?: boolean;
		label?: string;
		/** When false, only the UI is rendered (use hidden inputs in the parent form). */
		includeInputs?: boolean;
	}

	let {
		from = $bindable(''),
		to = $bindable(''),
		nameFrom = 'from',
		nameTo = 'to',
		required = true,
		label = 'بازه ماه',
		includeInputs = true
	}: Props = $props();

	function parseYm(value: string): { year: number; month: number } | null {
		const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
		if (!match) return null;
		const year = Number(match[1]);
		const month = Number(match[2]);
		if (!Number.isFinite(year) || month < 1 || month > 12) return null;
		return { year, month };
	}

	function toYm(year: number, month: number) {
		return `${year}-${String(month).padStart(2, '0')}`;
	}

	function ymKey(year: number, month: number) {
		return year * 12 + month;
	}

	function labelYm(value: string) {
		const parsed = parseYm(value);
		if (!parsed) return value || '—';
		return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
	}

	const initial = parseYm(from) ?? parseYm(to) ?? { year: new Date().getFullYear(), month: 1 };
	let viewYear = $state(initial.year);
	/** After choosing start, next click sets end. */
	let awaitingEnd = $state(false);

	const fromKey = $derived.by(() => {
		const parsed = parseYm(from);
		return parsed ? ymKey(parsed.year, parsed.month) : null;
	});
	const toKey = $derived.by(() => {
		const parsed = parseYm(to);
		return parsed ? ymKey(parsed.year, parsed.month) : null;
	});

	const summary = $derived(
		!from && !to
			? 'ماه شروع و پایان را انتخاب کنید'
			: from === to
				? labelYm(from)
				: `${labelYm(from)} تا ${labelYm(to)}`
	);

	function monthState(month: number): 'start' | 'end' | 'single' | 'in' | 'none' {
		if (fromKey == null || toKey == null) return 'none';
		const key = ymKey(viewYear, month);
		if (fromKey === toKey && key === fromKey) return 'single';
		if (key === fromKey) return 'start';
		if (key === toKey) return 'end';
		if (key > fromKey && key < toKey) return 'in';
		return 'none';
	}

	function selectMonth(month: number) {
		const ym = toYm(viewYear, month);
		const key = ymKey(viewYear, month);

		if (!awaitingEnd || fromKey == null) {
			from = ym;
			to = ym;
			awaitingEnd = true;
			return;
		}

		if (key < fromKey) {
			to = from;
			from = ym;
		} else {
			to = ym;
		}
		awaitingEnd = false;
	}

	function shiftYear(delta: number) {
		viewYear += delta;
	}
</script>

<div class="month-range" role="group" aria-label={label}>
	{#if includeInputs}
		<input type="hidden" name={nameFrom} value={from} {required} />
		<input type="hidden" name={nameTo} value={to} {required} />
	{/if}

	<div class="month-range-head">
		<span class="month-range-label">{label}</span>
		<strong class="month-range-summary">{summary}</strong>
		<span class="month-range-hint muted">
			{awaitingEnd ? 'حالا ماه پایان را بزنید' : 'اول ماه شروع، بعد ماه پایان'}
		</span>
	</div>

	<div class="month-range-nav">
		<button type="button" class="btn-secondary btn-compact" onclick={() => shiftYear(-1)} aria-label="سال قبل">
			‹
		</button>
		<span class="month-range-year mono">{viewYear}</span>
		<button type="button" class="btn-secondary btn-compact" onclick={() => shiftYear(1)} aria-label="سال بعد">
			›
		</button>
	</div>

	<div class="month-range-grid" role="listbox" aria-label="انتخاب ماه">
		{#each MONTHS as name, index (name)}
			{@const month = index + 1}
			{@const state = monthState(month)}
			<button
				type="button"
				class="month-cell"
				class:is-start={state === 'start'}
				class:is-end={state === 'end'}
				class:is-single={state === 'single'}
				class:is-in={state === 'in'}
				aria-selected={state !== 'none'}
				onclick={() => selectMonth(month)}
			>
				{name}
			</button>
		{/each}
	</div>
</div>

<style>
	.month-range {
		display: grid;
		gap: 0.7rem;
		padding: 0.85rem 0.95rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-paper) 88%, var(--color-bg-accent));
		min-width: 0;
	}

	.month-range-head {
		display: grid;
		gap: 0.2rem;
	}

	.month-range-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.month-range-summary {
		font-size: 0.98rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.45;
	}

	.month-range-hint {
		font-size: 0.78rem;
	}

	.month-range-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
	}

	.month-range-year {
		min-width: 4.5rem;
		text-align: center;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.month-range-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.35rem;
	}

	.month-cell {
		appearance: none;
		border: 1px solid transparent;
		border-radius: 8px;
		padding: 0.55rem 0.25rem;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-hover) 55%, transparent);
		cursor: pointer;
		transition:
			background var(--transition),
			border-color var(--transition),
			color var(--transition),
			transform 120ms ease;
	}

	.month-cell:hover {
		background: var(--color-hover);
		border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
	}

	.month-cell:focus-visible {
		outline: none;
		box-shadow: var(--ring);
	}

	.month-cell.is-in {
		background: color-mix(in srgb, var(--color-primary) 16%, var(--color-paper));
		color: var(--color-primary-dark);
		border-color: transparent;
	}

	.month-cell.is-start,
	.month-cell.is-end,
	.month-cell.is-single {
		background: var(--color-primary);
		color: #fff;
		border-color: var(--color-primary-dark);
	}

	html[data-theme='dark'] .month-cell.is-start,
	html[data-theme='dark'] .month-cell.is-end,
	html[data-theme='dark'] .month-cell.is-single {
		color: #042f2e;
	}

	html[data-theme='dark'] .month-cell.is-in {
		color: var(--color-primary-light);
	}

	@media (max-width: 520px) {
		.month-range-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
