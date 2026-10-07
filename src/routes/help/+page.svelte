<script lang="ts">
	const sections = [
		{ id: 'overview', title: 'معرفی' },
		{ id: 'login', title: 'ورود و حساب کاربری' },
		{ id: 'projects', title: 'پروژه‌ها و ریپوها' },
		{ id: 'params', title: 'پارامترهای محاسبه' },
		{ id: 'invoice', title: 'صدور و مدیریت فاکتور' },
		{ id: 'shares', title: 'سهم برنامه‌نویس‌ها' },
		{ id: 'export', title: 'خروجی CSV و Excel' },
		{ id: 'mail', title: 'ایمیل' },
		{ id: 'notes', title: 'نکات مهم' }
	];
</script>

<section class="paper mail-card help-hero">
	<header class="mail-card-head">
		<div>
			<h2 class="section-title">راهنمای استفاده از git to invoice</h2>
			<p class="muted mail-lead">
				این سامانه نفرساعت برنامه‌نویس‌ها را از تاریخچهٔ Git تخمین می‌زند و بر اساس آن فاکتور صادر می‌کند.
			</p>
		</div>
	</header>

	<nav class="help-toc" aria-label="فهرست راهنما">
		{#each sections as item}
			<a href="#{item.id}">{item.title}</a>
		{/each}
	</nav>
</section>

<section class="paper help-section" id="overview">
	<h3 class="help-heading">۱. معرفی</h3>
	<p>
		جریان کلی کار این است: پروژه بسازید → ریپوی <strong>محلی و فعال</strong> وصل کنید → پارامترهای محاسبه را تنظیم
		کنید → از همان پروژه فاکتور صادر کنید → در صورت نیاز ردیف‌ها را ویرایش یا آیتم دستی اضافه کنید → خروجی بگیرید.
	</p>
	<ol class="help-steps">
		<li>ساخت پروژه و تعیین ارز حساب‌وکتاب</li>
		<li>افزودن ریپازیتوری Git (فعلاً فقط مسیر local)</li>
		<li>تنظیم پارامترها در منوی «پارامترها»</li>
		<li>صدور فاکتور با بازهٔ ماه و نرخ ساعتی</li>
		<li>بازبینی، ویرایش و خروجی Excel/CSV</li>
	</ol>
</section>

<section class="paper help-section" id="login">
	<h3 class="help-heading">۲. ورود و حساب کاربری</h3>
	<ul class="help-list">
		<li>با ایمیل و رمز وارد شوید. حساب پیش‌فرض ادمین معمولاً <code>admin@local</code> است.</li>
		<li>از صفحهٔ ورود می‌توانید «فراموشی رمز» را بزنید (نیاز به تنظیم SMTP در بخش ایمیل).</li>
		<li>در «پروفایل من» نام نمایشی و رمز عبور را عوض کنید.</li>
		<li>از کارت کاربر در سایدبار می‌توانید خارج شوید.</li>
	</ul>
</section>

<section class="paper help-section" id="projects">
	<h3 class="help-heading">۳. پروژه‌ها و ریپوها</h3>
	<ul class="help-list">
		<li>از منوی <a href="/projects">پروژه‌ها</a> پروژه بسازید و ارز آن را انتخاب کنید (مثلاً CAD، USD، IRR).</li>
		<li>روی پروژه بروید و ریپازیتوری اضافه کنید.</li>
		<li>
			<strong>نوع local:</strong> مسیر پوشهٔ Git روی همین ماشین را بدهید (مثلاً
			<code>D:\work\my-repo</code>) و شاخه را مشخص کنید.
		</li>
		<li>فقط ریپوهایی که <strong>فعال</strong> باشند در محاسبه لحاظ می‌شوند.</li>
		<li>
			از دکمهٔ <strong>فاکتور</strong> در لیست پروژه‌ها یا صفحهٔ ریپوها وارد صدور فاکتور شوید.
		</li>
		<li>
			<strong>توجه:</strong> ریپوی آنلاین فعلاً پشتیبانی نمی‌شود و در محاسبه رد می‌شود. بعداً می‌توان clone/mirror
			اضافه کرد.
		</li>
	</ul>
</section>

<section class="paper help-section" id="params">
	<h3 class="help-heading">۴. پارامترهای محاسبه</h3>
	<p>
		در <a href="/params">پارامترها</a> قواعد تخمین نفرساعت از روی کامیت‌ها تنظیم می‌شود. این مقادیر روی همهٔ
		پروژه‌ها اعمال می‌شود.
	</p>
	<ul class="help-list">
		<li><strong>خطوط در ساعت (افزودن/حذف):</strong> سرعت تقریبی کار برای تبدیل حجم تغییر به ساعت</li>
		<li><strong>وزن حذف:</strong> سهم خطوط حذف‌شده نسبت به افزوده‌شده</li>
		<li><strong>حداقل / حداکثر ساعت یک کامیت:</strong> کف و سقف زمان هر کامیت</li>
		<li><strong>فاصلهٔ ادغام سشن:</strong> کامیت‌های نزدیک یک نفر در یک سشن جمع می‌شوند</li>
		<li><strong>سقف روزانه:</strong> حداکثر نفرساعت قابل قبول در یک روز برای یک نفر</li>
		<li><strong>حذف www:</strong> نادیده گرفتن مسیرهای خاص مثل پوشهٔ www در آمار فایل</li>
	</ul>
	<p class="hint-box">
		اگر پارامترها را عوض کردید، روی فاکتورهای قبلی دکمهٔ <strong>محاسبه مجدد</strong> را بزنید تا ردیف‌های ریپو با
		قواعد جدید دوباره ساخته شوند.
	</p>
</section>

<section class="paper help-section" id="invoice">
	<h3 class="help-heading">۵. صدور و مدیریت فاکتور</h3>
	<ol class="help-steps">
		<li>از پروژه وارد صفحهٔ فاکتورها شوید.</li>
		<li>بازهٔ «از ماه» تا «تا ماه»، نرخ ساعتی (اختیاری) و زبان فاکتور را مشخص کنید.</li>
		<li>با «صدور فاکتور» لاگ Git خوانده می‌شود و ریز کارکرد ساخته می‌شود.</li>
	</ol>
	<p>داخل فاکتور می‌توانید:</p>
	<ul class="help-list">
		<li><strong>زبان</strong> را بین فارسی و English عوض کنید.</li>
		<li>
			<strong>نفرساعت</strong> را با دوبار کلیک روی مقدار ویرایش کنید؛ ردیف ویرایش‌شده سبز و با بج «ویرایش‌شده»
			مشخص می‌شود.
		</li>
		<li>
			<strong>افزودن آیتم</strong> برای کارکرد دستی (جلسه، کار بدون کامیت و …)؛ ایمیل را از لیست انتخاب کنید یا
			ایمیل دیگر بنویسید. ردیف‌های دستی زردرنگ‌اند.
		</li>
		<li>
			<strong>محاسبه مجدد</strong> ردیف‌های ریپو را با پارامترهای فعلی دوباره می‌سازد؛ ردیف‌های دستی می‌مانند.
		</li>
		<li>جمع نفرساعت، نرخ ساعت، مبلغ کل و دوره در بالای فاکتور دیده می‌شود.</li>
	</ul>
</section>

<section class="paper help-section" id="shares">
	<h3 class="help-heading">۶. سهم برنامه‌نویس‌ها</h3>
	<ul class="help-list">
		<li>دکمهٔ <strong>سهم برنامه‌نویس‌ها</strong> لیست هر ایمیل را با ساعت، درصد سهم و مبلغ نشان می‌دهد.</li>
		<li>با «مشاهده» ریز کارکرد همان نفر را جدا می‌بینید.</li>
	</ul>
</section>

<section class="paper help-section" id="export">
	<h3 class="help-heading">۷. خروجی CSV و Excel</h3>
	<ul class="help-list">
		<li><strong>دانلود CSV:</strong> ریز ردیف‌ها با هدر متناسب با زبان فاکتور</li>
		<li>
			<strong>دانلود Excel:</strong> فایل xlsx مرتب با خلاصه، جدول کارکرد و هایلایت دستی/ویرایش‌شده — بدون ترک صفحه
		</li>
	</ul>
</section>

<section class="paper help-section" id="mail">
	<h3 class="help-heading">۸. ایمیل</h3>
	<ul class="help-list">
		<li>در <a href="/mail">ایمیل</a> تنظیمات SMTP را ذخیره کنید.</li>
		<li>با ارسال تست مطمئن شوید بازیابی رمز و نامه‌های سامانه کار می‌کنند.</li>
	</ul>
</section>

<section class="paper help-section" id="notes">
	<h3 class="help-heading">۹. نکات مهم</h3>
	<ul class="help-list">
		<li>روی ماشینی که برنامه اجرا می‌شود باید <code>git</code> نصب باشد و به مسیر ریپوی local دسترسی داشته باشد.</li>
		<li>ریپوی بدون کامیت در بازهٔ انتخاب‌شده یا ریپوی خراب در لیست ردشده‌ها گزارش می‌شود.</li>
		<li>پیام کامیت‌ها کامل ذخیره می‌شود (خلاصه نمی‌شود).</li>
		<li>کاربران را از منوی <a href="/users">کاربران</a> مدیریت کنید.</li>
	</ul>
</section>
