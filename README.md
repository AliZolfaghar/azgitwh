# git to invoice — تخمین نفرساعت از روی Git

ابزار وب برای تخمین ساعت کاری توسعه‌دهندگان از روی تاریخچهٔ Git (بر اساس پارامترها و ریپازیتوری‌هایی که تعریف می‌کنید).

**وضعیت فعلی:** اسکلت SvelteKit + SQLite (Knex) + UI الهام‌گرفته از [MaterialAdminLTE](https://github.com/DucThanhNguyen/MaterialAdminLTE) — ورود و داشبورد آماده است.

نسخهٔ CLI قدیمی در `gitreport.js` برای مرجع باقی مانده است.

## پیش‌نیازها

- Node.js 24+
- `git` در PATH

## اجرا

```bash
npm install
npm run dev          # http://localhost:5173
```

ورود اولیه:

- ایمیل: `admin@local`
- کلمه عبور: `admin@1234`

ساخت و اجرای production:

```bash
npm run build
npm start
```

## دیتابیس (Knex + SQLite)

- فایل: `data/app.db` (`better-sqlite3`)
- مسیر جایگزین: متغیر محیطی `AZGITWH_DATA_DIR`
- مایگریشن‌ها: پوشهٔ `migrations/`
- سیدها: پوشهٔ `seeds/` (کاربر admin)
- با استارت سرور (هوک `init` در `hooks.server.ts`) به‌صورت خودکار `migrate:latest` و `seed:run` اجرا می‌شوند — نیازی به اجرای دستی قبل از `npm run dev` نیست

دستی (اختیاری):

```bash
npm run db:migrate
npm run db:rollback
npm run db:seed
```

## پشته

- SvelteKit 3 + Svelte 5
- `@sveltejs/adapter-node`
- Knex + better-sqlite3
- UI: لایه‌بندی Material Admin
