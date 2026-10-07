<script lang="ts">
	import FormAlert from '#lib/components/FormAlert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const initial = $derived(data.params);

	let linesPerHourAdd = $state(65);
	let linesPerHourDel = $state(110);
	let deleteWeight = $state(0.65);
	let minWorkTime = $state(0.25);
	let maxWorkTimeSingle = $state(5);
	let maxGapMinutes = $state(90);
	let dailyMaxHours = $state(8);
	let excludeWww = $state(true);
	let syncKey = $state('');

	$effect(() => {
		const snapshot = form && 'lines_per_hour_add' in form ? form : null;
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
					initial.linesPerHourAdd,
					initial.linesPerHourDel,
					initial.deleteWeight,
					initial.minWorkTime,
					initial.maxWorkTimeSingle,
					initial.maxGapMinutes,
					initial.dailyMaxHours,
					initial.excludeWww
				].join('|');

		if (key === syncKey) return;
		syncKey = key;

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

		linesPerHourAdd = initial.linesPerHourAdd;
		linesPerHourDel = initial.linesPerHourDel;
		deleteWeight = initial.deleteWeight;
		minWorkTime = initial.minWorkTime;
		maxWorkTimeSingle = initial.maxWorkTimeSingle;
		maxGapMinutes = initial.maxGapMinutes;
		dailyMaxHours = initial.dailyMaxHours;
		excludeWww = initial.excludeWww;
	});
</script>

<FormAlert {form} />

<section class="paper mail-intro">
	<p class="muted" style="margin: 0">
		این مقادیر همان منطق <span class="kbd">gitreport.js</span> هستند و برای تخمین نفرساعت همهٔ پروژه‌ها
		استفاده می‌شوند.
	</p>
</section>

<form method="POST" class="mail-page">
	<section class="paper mail-card">
		<header class="mail-card-head">
			<div>
				<h2 class="section-title">پارامترهای تخمین</h2>
				<p class="muted mail-lead">
					هر پارامتر مستقیم روی محاسبهٔ زمان توسعه از روی تغییرات Git اثر می‌گذارد.
				</p>
			</div>
		</header>

		<div class="mail-grid params-grid">
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
				<small class="field-hint">
					فرض می‌کند یک توسعه‌دهنده در یک ساعت تقریباً چند خط کد جدید می‌نویسد. عدد بالاتر = ساعت
					تخمینی کمتر برای همان حجم اضافه.
				</small>
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
				<small class="field-hint">
					سرعت فرضی حذف/بازنویسی خطوط. با پارامتر افزودن، میانگین نرخ خطوط ساخته می‌شود و حجم کار به
					ساعت تبدیل می‌گردد.
				</small>
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
				<small class="field-hint">
					در فرمول تلاش: <span class="kbd">افزوده + حذف × وزن</span>. کمتر از ۱ یعنی حذف ارزان‌تر از
					نوشتن جدید است؛ بیشتر از ۱ یعنی حذف را سنگین‌تر حساب می‌کند.
				</small>
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
				<small class="field-hint">
					حتی برای کامیت‌های خیلی کوچک، حداقل این مقدار ساعت ثبت می‌شود تا کار جزئی صفر نشود
					(پیش‌فرض ۰٫۲۵ ≈ ۱۵ دقیقه).
				</small>
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
				<small class="field-hint">
					سقف زمان یک کامیت تکی. جلوی تخمین غیرواقعی برای کامیت‌های خیلی حجیم (مثل import بزرگ) را
					می‌گیرد.
				</small>
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
				<small class="field-hint">
					اگر دو کامیت پشت‌سرهم از یک نفر فاصله‌شان از این مقدار کمتر باشد، در یک سشن کاری ادغام
					می‌شوند و ساعت‌هایشان جمع می‌گردد.
				</small>
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
				<small class="field-hint">
					برای هر نفر در هر روز، مجموع ساعت از این مقدار بیشتر نمی‌شود (مثلاً ۸ ساعت کاری). روزهایی
					که سقف بخورد در گزارش علامت می‌خورند.
				</small>
			</label>

			<div class="field field-toggle">
				<span>حذف مسیرهای www از آمار</span>
				<label class="mail-check-control params-toggle">
					<input type="checkbox" name="exclude_www" bind:checked={excludeWww} />
					<span>{excludeWww ? 'فعال' : 'خاموش'}</span>
				</label>
				<small class="field-hint">
					اگر روشن باشد، فایل‌هایی که مسیرشان شامل <span class="kbd">www</span> است در شمارش خط و
					ساعت لحاظ نمی‌شوند (معمولاً خروجی build یا استاتیک).
				</small>
			</div>
		</div>

		<footer class="mail-footer">
			<button type="submit" class="btn-primary">ذخیره پارامترها</button>
		</footer>
	</section>
</form>
