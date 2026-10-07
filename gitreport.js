const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ExcelJS = require('exceljs');

const DEFAULT_REPOSITORIES = [
  String.raw`D:\github\Nalaris_Resto_back`,
  String.raw`D:\github\Nalaris_Resto_front`,
  String.raw`D:\github\Nalaris_Resto_agent`,
  String.raw`D:\temp_git\epi2_agent`,
  String.raw`D:\temp_git\epi2_front`,
  String.raw`D:\temp_git\epi2_back`,
  String.raw`D:\github\gitea.hmb.ir\epi2_back`,
  String.raw`D:\github\gitea.hmb.ir\epi2_front`,
  String.raw`D:\github\aisourcefusion`,
];

const REPORT_PERIODS = (process.env.GIT_REPORT_PERIODS ?? '2026-08,2026-09')
  .split(',')
  .map((period) => period.trim())
  .filter(Boolean);
const REPOSITORIES = process.env.GIT_REPORT_REPOSITORIES
  ? JSON.parse(process.env.GIT_REPORT_REPOSITORIES)
  : DEFAULT_REPOSITORIES;
const OUTPUT_DIR = process.env.GIT_REPORT_OUTPUT_DIR || __dirname;
const EXCLUDE_WWW = process.env.GIT_REPORT_EXCLUDE_WWW !== 'false';

const LINES_PER_HOUR_ADD = 65;
const LINES_PER_HOUR_DEL = 110;
const MIN_WORK_TIME = 0.25;
const MAX_WORK_TIME_SINGLE = 5.0;
const MAX_GAP_MINUTES = 90;
const DAILY_MAX_HOURS = 8.0;

function shouldExcludeFile(filename) {
  if (!EXCLUDE_WWW) return false;
  return ['/www/', '\\www\\', 'www/', 'www\\'].some((pattern) => filename.includes(pattern));
}

function getGitLog(repoPath) {
  try {
    return execFileSync(
      'git',
      ['log', '--all', '--pretty=format:%H|%an|%ae|%ad|%s', '--date=iso-strict', '--numstat'],
      { cwd: repoPath, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = error.stderr ? error.stderr.toString().trim() : error.message;
    console.error(`خطا در ${repoPath}: ${detail}`);
    return null;
  }
}

function parseDate(dateText) {
  const match = dateText.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    return {
      date: fallback,
      dateText: formatDate(fallback),
      timeText: formatTime(fallback),
      period: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`,
    };
  }

  const dateTextPart = match ? match[1] : formatDate(date);
  const timeTextPart = match ? match[2] : formatTime(date);
  return {
    date,
    dateText: dateTextPart,
    timeText: timeTextPart,
    period: dateTextPart.slice(0, 7),
  };
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function roundToEven(value) {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.max(1, Math.abs(value))) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(value);
}

function parseCommits(repoPath, repoName) {
  const output = getGitLog(repoPath);
  if (!output) return [];

  const commits = [];
  let current = null;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes('|') && line.includes('@') && (line.match(/\|/g) || []).length >= 4) {
      if (current && current.files.length) commits.push(current);

      const fields = [];
      let remaining = line;
      for (let i = 0; i < 4; i += 1) {
        const separator = remaining.indexOf('|');
        fields.push(remaining.slice(0, separator));
        remaining = remaining.slice(separator + 1);
      }
      const [hash, author, email, dateString] = fields;
      const message = remaining;
      const parsedDate = parseDate(dateString);

      if (REPORT_PERIODS.length && !REPORT_PERIODS.includes(parsedDate.period)) {
        current = null;
        continue;
      }

      current = {
        repo: repoName,
        period: parsedDate.period,
        datetime: parsedDate.date,
        dateText: parsedDate.dateText,
        timeText: parsedDate.timeText,
        timestamp: parsedDate.date.getTime() / 1000,
        author: author.trim(),
        email: email.trim(),
        commit: hash.slice(0, 8),
        message: message.trim().slice(0, 180),
        files: [],
        added: 0,
        deleted: 0,
      };
    } else if (current && line.includes('\t')) {
      const [addedText, deletedText, filename] = line.split('\t');
      if (filename === undefined || shouldExcludeFile(filename)) continue;

      const added = /^\d+$/.test(addedText) ? Number.parseInt(addedText, 10) : 0;
      const deleted = /^\d+$/.test(deletedText) ? Number.parseInt(deletedText, 10) : 0;
      current.files.push(filename);
      current.added += added;
      current.deleted += deleted;
    }
  }

  if (current && current.files.length) commits.push(current);

  for (const commit of commits) {
    const effort = commit.added + commit.deleted * 0.65;
    const hours = effort / ((LINES_PER_HOUR_ADD + LINES_PER_HOUR_DEL) / 2);
    commit.dev_hours = Math.max(
      MIN_WORK_TIME,
      Math.min(MAX_WORK_TIME_SINGLE, roundToEven(hours * 4) / 4),
    );
  }

  return commits;
}

function mergeCloseSessions(commits, maxGapMinutes = MAX_GAP_MINUTES) {
  if (!commits.length) return commits;

  commits.sort((a, b) => a.timestamp - b.timestamp);

  const merged = [];
  let current = {
    ...commits[0],
    commits_in_session: 1,
    original_commits: [commits[0].commit],
  };

  for (const next of commits.slice(1)) {
    const gapMinutes = (next.timestamp - current.timestamp) / 60;
    if (next.email === current.email && gapMinutes <= maxGapMinutes) {
      current.commits_in_session += 1;
      current.original_commits.push(next.commit);
      current.added += next.added;
      current.deleted += next.deleted;
      current.message += `  •  ${next.message.slice(0, 60)}`;
      current.dev_hours += next.dev_hours;
    } else {
      merged.push(current);
      current = {
        ...next,
        commits_in_session: 1,
        original_commits: [next.commit],
      };
    }
  }

  merged.push(current);
  return merged;
}

function timestampForFilename(date = new Date()) {
  return `${formatDate(date).replaceAll('-', '')}_${formatTime(date).replaceAll(':', '')}`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function excelColumnName(columnNumber) {
  let name = '';
  let number = columnNumber;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function outputPath(filename) {
  return path.join(OUTPUT_DIR, filename);
}

async function generateReport() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const allCommits = [];

  console.log('پردازش ریپازیتوری‌ها ...');
  for (const repoPath of REPOSITORIES) {
    const repoName = path.win32.basename(repoPath);
    console.log(`  → ${repoName}`);
    allCommits.push(...parseCommits(repoPath, repoName));
  }

  if (!allCommits.length) {
    console.log('هیچ کامیتی یافت نشد.');
    return;
  }

  const timestamp = timestampForFilename();
  const periodSuffix = REPORT_PERIODS.join('_');
  const rawHeaders = [
    'ریپازیتوری', 'دوره', 'تاریخ', 'زمان', 'ایمیل', 'نام نویسنده',
    'کد_کامیت', 'پیام_کامیت', 'تعداد_فایل', '+خط', '-خط', 'زمان_تخمینی_ساعت',
  ];
  const rawRows = allCommits.map((commit) => [
    commit.repo,
    commit.period,
    commit.dateText,
    commit.timeText,
    commit.email,
    commit.author,
    commit.commit,
    commit.message,
    commit.files.length,
    commit.added,
    commit.deleted,
    commit.dev_hours,
  ]);
  const rawCsvPath = outputPath(`git_raw_commits_${periodSuffix}_${timestamp}.csv`);
  const rawCsv = [rawHeaders, ...rawRows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  fs.writeFileSync(rawCsvPath, `\uFEFF${rawCsv}\r\n`, 'utf8');
  console.log(`دیتای خام تمام کامیت‌ها ذخیره شد → ${rawCsvPath}`);

  const byPersonDay = new Map();
  for (const commit of allCommits) {
    const key = `${commit.email}\0${commit.dateText}`;
    if (!byPersonDay.has(key)) byPersonDay.set(key, []);
    byPersonDay.get(key).push(commit);
  }

  const dailyRows = [];
  for (const [key, commitsDay] of byPersonDay) {
    const [email, day] = key.split('\0');
    const mergedDay = mergeCloseSessions(commitsDay);
    const totalDevHoursRaw = mergedDay.reduce((sum, session) => sum + session.dev_hours, 0);
    const totalDevHours = Math.min(totalDevHoursRaw, DAILY_MAX_HOURS);
    const cappedNote = totalDevHoursRaw > DAILY_MAX_HOURS ? ' (سقف ۸ ساعت اعمال شد)' : '';
    const repos = [...new Set(mergedDay.map((session) => session.repo))].join(', ');
    const messages = [];
    const files = new Set();
    let commitCount = 0;

    for (const session of mergedDay) {
      messages.push(session.message.slice(0, 80));
      session.files.forEach((filename) => files.add(filename));
      commitCount += session.commits_in_session;
    }

    let messageSummary = messages.join(' | ').slice(0, 220);
    if (messages.length > 3) messageSummary += ' ...';
    const fileList = [...files];
    let fileSummary = fileList.slice(0, 5).join(', ');
    if (files.size > 5) fileSummary += ` ... +${files.size - 5} فایل دیگر`;

    dailyRows.push({
      'ایمیل': email,
      'تاریخ': day,
      'دوره': day.slice(0, 7),
      'ریپازیتوری‌ها': repos,
      'تعداد سشن': mergedDay.length,
      'تعداد کامیت': commitCount,
      'زمان_تخمینی_ساعت': Number(totalDevHours.toFixed(2)),
      'پیام‌ها (خلاصه)': messageSummary,
      'فایل‌ها (نمونه)': fileSummary,
      'تعداد فایل کل': files.size,
      '+خط کل': mergedDay.reduce((sum, session) => sum + session.added, 0),
      '-خط کل': mergedDay.reduce((sum, session) => sum + session.deleted, 0),
      'یادداشت': cappedNote,
    });
  }

  if (!dailyRows.length) {
    console.log('هیچ رکوردی پس از پردازش باقی نماند.');
    return;
  }

  dailyRows.sort((a, b) => a['ایمیل'].localeCompare(b['ایمیل']) || a['تاریخ'].localeCompare(b['تاریخ']));
  const excelPath = outputPath(`git_report_per_day_${periodSuffix}_${timestamp}.xlsx`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('گزارش_روزانه');
  const dailyHeaders = Object.keys(dailyRows[0]);
  worksheet.addRow(dailyHeaders);
  dailyRows.forEach((row) => worksheet.addRow(dailyHeaders.map((header) => row[header])));

  const widths = {
    'ایمیل': 28, 'تاریخ': 12, 'دوره': 9, 'ریپازیتوری‌ها': 25,
    'تعداد سشن': 12, 'تعداد کامیت': 14, 'زمان_تخمینی_ساعت': 18,
    'پیام‌ها (خلاصه)': 50, 'فایل‌ها (نمونه)': 55, 'تعداد فایل کل': 14,
    '+خط کل': 14, '-خط کل': 14, 'یادداشت': 18,
  };
  for (const [header, width] of Object.entries(widths)) {
    const index = dailyHeaders.indexOf(header);
    if (index !== -1) worksheet.getColumn(excelColumnName(index + 1)).width = width;
  }
  await workbook.xlsx.writeFile(excelPath);

  const totalHours = dailyRows.reduce((sum, row) => sum + row['زمان_تخمینی_ساعت'], 0);
  const rawTotal = [...byPersonDay.values()]
    .reduce((sum, commits) => sum + commits.reduce((daySum, commit) => daySum + commit.dev_hours, 0), 0);
  const cappedDays = dailyRows.filter((row) => row['یادداشت'].includes('سقف')).length;

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`گزارش اکسل ذخیره شد → ${excelPath}`);
  console.log(`دیتای خام CSV ذخیره شد → ${rawCsvPath}`);
  console.log(`تعداد ردیف‌ها (نفر-روز): ${dailyRows.length}`);
  console.log(`مجموع ساعت تخمینی (پس از سقف ۸ ساعت): ${totalHours.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ساعت`);
  console.log(`تعداد روزهایی که سقف اعمال شد: ${cappedDays}`);
  console.log(`مجموع ساعت خام قبل از سقف: ${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ساعت`);
  console.log('═'.repeat(80));
}

if (require.main === module) {
  generateReport().catch((error) => {
    console.error(`خطا هنگام ساخت گزارش: ${error.message}`);
    process.exitCode = 1;
  });
}
