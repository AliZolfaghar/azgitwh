<script lang="ts">
	import SmallBox from '#lib/components/layout/SmallBox.svelte';
	import {
		iconClock,
		iconDatabase,
		iconFolder,
		iconGit
	} from '#lib/components/layout/icons.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="small-boxes">
	<SmallBox
		title="پروژه"
		value={String(data.projectCount)}
		color="#1976d2"
		iconHtml={iconFolder}
	/>
	<SmallBox title="ریپازیتوری" value="—" color="#2e7d32" iconHtml={iconGit} />
	<SmallBox title="نفرساعت تخمینی" value="—" color="#f9a825" iconHtml={iconClock} />
	<SmallBox title="دیتابیس" value="OK" color="#c62828" iconHtml={iconDatabase} />
</div>

<section class="paper">
	<h2 style="margin: 0 0 0.75rem; font-weight: 500; font-size: 1.15rem">شروع از پروژه</h2>
	<p class="muted">
		هر گزارش نفرساعت و ریپازیتوری زیر یک <strong>پروژه</strong> تعریف می‌شود. از منوی
		<a href="/projects">پروژه‌ها</a> می‌توانید پروژه جدید بسازید یا ویرایش کنید.
	</p>

	<hr style="border: 0; border-top: 1px solid var(--color-border); margin: 1.25rem 0" />

	<p class="muted" style="margin: 0">
		SQLite:
		<span class="kbd">{data.dbPath}</span>
		{#if data.installedAt}
			· ساخته‌شده در <span class="kbd">{data.installedAt}</span>
		{/if}
		· Node <span class="kbd">{data.runtime.node}</span>
	</p>
</section>
