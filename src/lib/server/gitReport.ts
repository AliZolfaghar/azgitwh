import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { getProjectById } from './projects.js';
import { listProjectRepositories } from './repositories.js';
import { getReportParams, type ReportParams } from './reportParams.js';

const execFileAsync = promisify(execFile);

export type ReportCommit = {
	repo: string;
	period: string;
	datetime: Date;
	dateText: string;
	timeText: string;
	timestamp: number;
	author: string;
	email: string;
	commit: string;
	message: string;
	files: string[];
	added: number;
	deleted: number;
	dev_hours: number;
};

export type ReportSession = ReportCommit & {
	commits_in_session: number;
	original_commits: string[];
};

export type DailyReportRow = {
	email: string;
	date: string;
	period: string;
	repos: string;
	sessions: number;
	commits: number;
	hours: number;
	messages: string;
	filesSample: string;
	fileCount: number;
	added: number;
	deleted: number;
	note: string;
};

export type ProjectReportResult = {
	rawCommits: ReportCommit[];
	dailyRows: DailyReportRow[];
	totals: {
		personDays: number;
		hoursCapped: number;
		hoursRaw: number;
		cappedDays: number;
		reposUsed: number;
		reposSkipped: string[];
	};
	params: ReturnType<typeof summarizeParams>;
	periods: string[];
};

function summarizeParams(params: ReportParams) {
	return {
		linesPerHourAdd: params.lines_per_hour_add,
		linesPerHourDel: params.lines_per_hour_del,
		deleteWeight: params.delete_weight,
		minWorkTime: params.min_work_time,
		maxWorkTimeSingle: params.max_work_time_single,
		maxGapMinutes: params.max_gap_minutes,
		dailyMaxHours: params.daily_max_hours,
		excludeWww: params.exclude_www
	};
}

function shouldExcludeFile(filename: string, excludeWww: boolean) {
	if (!excludeWww) return false;
	return ['/www/', '\\www\\', 'www/', 'www\\'].some((pattern) => filename.includes(pattern));
}

function formatDate(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(date: Date) {
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function parseDate(dateText: string) {
	const match = dateText.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
	const date = new Date(dateText);
	if (Number.isNaN(date.getTime())) {
		const fallback = new Date();
		return {
			date: fallback,
			dateText: formatDate(fallback),
			timeText: formatTime(fallback),
			period: `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`
		};
	}

	const dateTextPart = match ? match[1] : formatDate(date);
	const timeTextPart = match ? match[2] : formatTime(date);
	return {
		date,
		dateText: dateTextPart,
		timeText: timeTextPart,
		period: dateTextPart.slice(0, 7)
	};
}

function roundToEven(value: number) {
	const floor = Math.floor(value);
	const fraction = value - floor;
	if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.max(1, Math.abs(value))) {
		return floor % 2 === 0 ? floor : floor + 1;
	}
	return Math.round(value);
}

async function getGitLog(repoPath: string, branch?: string) {
	const args = [
		'log',
		branch?.trim() ? branch.trim() : '--all',
		'--pretty=format:%H|%an|%ae|%ad|%s',
		'--date=iso-strict',
		'--numstat'
	];

	try {
		const { stdout } = await execFileAsync('git', args, {
			cwd: repoPath,
			encoding: 'utf8',
			maxBuffer: 128 * 1024 * 1024,
			windowsHide: true
		});
		return stdout;
	} catch (error) {
		const err = error as { stderr?: string; message?: string };
		const detail = err.stderr?.toString().trim() || err.message || 'خطای ناشناخته';
		throw new Error(detail);
	}
}

function parseCommits(
	output: string,
	repoName: string,
	periods: string[],
	params: ReportParams
): ReportCommit[] {
	const commits: ReportCommit[] = [];
	let current: Omit<ReportCommit, 'dev_hours'> | null = null;

	for (const rawLine of output.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		if (line.includes('|') && line.includes('@') && (line.match(/\|/g) || []).length >= 4) {
			if (current && current.files.length) {
				commits.push({ ...current, dev_hours: 0 });
			}

			const fields: string[] = [];
			let remaining = line;
			for (let i = 0; i < 4; i += 1) {
				const separator = remaining.indexOf('|');
				fields.push(remaining.slice(0, separator));
				remaining = remaining.slice(separator + 1);
			}
			const [hash, author, email, dateString] = fields;
			const message = remaining;
			const parsedDate = parseDate(dateString);

			if (periods.length && !periods.includes(parsedDate.period)) {
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
				message: message.trim(),
				files: [],
				added: 0,
				deleted: 0
			};
		} else if (current && line.includes('\t')) {
			const [addedText, deletedText, filename] = line.split('\t');
			if (filename === undefined || shouldExcludeFile(filename, params.exclude_www)) continue;

			const added = /^\d+$/.test(addedText) ? Number.parseInt(addedText, 10) : 0;
			const deleted = /^\d+$/.test(deletedText) ? Number.parseInt(deletedText, 10) : 0;
			current.files.push(filename);
			current.added += added;
			current.deleted += deleted;
		}
	}

	if (current && current.files.length) {
		commits.push({ ...current, dev_hours: 0 });
	}

	const avgLinesPerHour = (params.lines_per_hour_add + params.lines_per_hour_del) / 2;
	for (const commit of commits) {
		const effort = commit.added + commit.deleted * params.delete_weight;
		const hours = effort / avgLinesPerHour;
		commit.dev_hours = Math.max(
			params.min_work_time,
			Math.min(params.max_work_time_single, roundToEven(hours * 4) / 4)
		);
	}

	return commits;
}

function mergeCloseSessions(commits: ReportCommit[], maxGapMinutes: number): ReportSession[] {
	if (!commits.length) return [];

	const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);
	const merged: ReportSession[] = [];
	let current: ReportSession = {
		...sorted[0],
		commits_in_session: 1,
		original_commits: [sorted[0].commit]
	};

	for (const next of sorted.slice(1)) {
		const gapMinutes = (next.timestamp - current.timestamp) / 60;
		if (next.email === current.email && gapMinutes <= maxGapMinutes) {
			current.commits_in_session += 1;
			current.original_commits.push(next.commit);
			current.added += next.added;
			current.deleted += next.deleted;
			current.message += `  •  ${next.message}`;
			current.dev_hours += next.dev_hours;
			current.files = [...current.files, ...next.files];
		} else {
			merged.push(current);
			current = {
				...next,
				commits_in_session: 1,
				original_commits: [next.commit]
			};
		}
	}

	merged.push(current);
	return merged;
}

function buildDailyRows(allCommits: ReportCommit[], params: ReportParams): DailyReportRow[] {
	const byPersonDay = new Map<string, ReportCommit[]>();
	for (const commit of allCommits) {
		const key = `${commit.email}\0${commit.dateText}`;
		const list = byPersonDay.get(key);
		if (list) list.push(commit);
		else byPersonDay.set(key, [commit]);
	}

	const dailyRows: DailyReportRow[] = [];
	for (const [key, commitsDay] of byPersonDay) {
		const [email, day] = key.split('\0');
		const mergedDay = mergeCloseSessions(commitsDay, params.max_gap_minutes);
		const totalDevHoursRaw = mergedDay.reduce((sum, session) => sum + session.dev_hours, 0);
		const totalDevHours = Math.min(totalDevHoursRaw, params.daily_max_hours);
		const cappedNote =
			totalDevHoursRaw > params.daily_max_hours
				? ` (سقف ${params.daily_max_hours} ساعت اعمال شد)`
				: '';
		const repos = [...new Set(mergedDay.map((session) => session.repo))].join(', ');
		const messages: string[] = [];
		const files = new Set<string>();
		let commitCount = 0;

		for (const session of mergedDay) {
			if (session.message) messages.push(session.message);
			session.files.forEach((filename) => files.add(filename));
			commitCount += session.commits_in_session;
		}

		const fileList = [...files];
		let fileSummary = fileList.slice(0, 5).join(', ');
		if (files.size > 5) fileSummary += ` ... +${files.size - 5} فایل دیگر`;

		dailyRows.push({
			email,
			date: day,
			period: day.slice(0, 7),
			repos,
			sessions: mergedDay.length,
			commits: commitCount,
			hours: Number(totalDevHours.toFixed(2)),
			messages: messages.join(' | '),
			filesSample: fileSummary,
			fileCount: files.size,
			added: mergedDay.reduce((sum, session) => sum + session.added, 0),
			deleted: mergedDay.reduce((sum, session) => sum + session.deleted, 0),
			note: cappedNote
		});
	}

	dailyRows.sort((a, b) => a.email.localeCompare(b.email) || a.date.localeCompare(b.date));
	return dailyRows;
}

export function parsePeriods(raw: string): string[] {
	return raw
		.split(/[,،\s]+/)
		.map((item) => item.trim())
		.filter((item) => /^\d{4}-\d{2}$/.test(item));
}

export function isYearMonth(value: string): boolean {
	return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Inclusive list of YYYY-MM from `from` through `to`. */
export function periodsFromRange(fromYm: string, toYm: string): string[] | null {
	if (!isYearMonth(fromYm) || !isYearMonth(toYm)) return null;

	let [fromYear, fromMonth] = fromYm.split('-').map(Number);
	let [toYear, toMonth] = toYm.split('-').map(Number);
	let start = fromYear * 12 + (fromMonth - 1);
	let end = toYear * 12 + (toMonth - 1);
	if (start > end) {
		[start, end] = [end, start];
	}

	const periods: string[] = [];
	for (let cursor = start; cursor <= end; cursor += 1) {
		const year = Math.floor(cursor / 12);
		const month = (cursor % 12) + 1;
		periods.push(`${year}-${String(month).padStart(2, '0')}`);
	}
	return periods;
}

export function defaultPeriodRange(): { from: string; to: string } {
	const now = new Date();
	const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const from = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
	return { from, to };
}

export function defaultPeriods(): string[] {
	const range = defaultPeriodRange();
	return periodsFromRange(range.from, range.to) ?? [];
}

export async function generateProjectReport(
	projectId: number,
	periodsInput: string[]
): Promise<{ ok: true; report: ProjectReportResult } | { ok: false; message: string }> {
	const project = await getProjectById(projectId);
	if (!project) {
		return { ok: false, message: 'پروژه یافت نشد.' };
	}

	const periods = periodsInput.length ? periodsInput : defaultPeriods();
	if (!periods.length) {
		return { ok: false, message: 'حداقل یک دوره به شکل YYYY-MM وارد کنید.' };
	}

	const params = await getReportParams();
	const repositories = (await listProjectRepositories(projectId)).filter((repo) =>
		Boolean(repo.enabled)
	);

	if (!repositories.length) {
		return {
			ok: false,
			message: 'هیچ ریپازیتوری فعالی برای این پروژه وجود ندارد.'
		};
	}

	const allCommits: ReportCommit[] = [];
	const reposSkipped: string[] = [];
	let reposUsed = 0;

	for (const repo of repositories) {
		if (repo.kind !== 'local') {
			reposSkipped.push(`${repo.name} (آنلاین — فعلاً پشتیبانی نمی‌شود)`);
			continue;
		}

		const repoPath = path.resolve(repo.location);
		const repoName = repo.name || path.basename(repoPath);

		try {
			const output = await getGitLog(repoPath, repo.branch || undefined);
			const commits = parseCommits(output, repoName, periods, params);
			allCommits.push(...commits);
			reposUsed += 1;
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			reposSkipped.push(`${repoName}: ${detail}`);
		}
	}

	if (!allCommits.length) {
		return {
			ok: false,
			message:
				reposSkipped.length > 0
					? `کامیتی یافت نشد. ریپوهای ردشده: ${reposSkipped.join(' · ')}`
					: 'در دوره‌های انتخاب‌شده کامیتی یافت نشد.'
		};
	}

	const dailyRows = buildDailyRows(allCommits, params);
	const hoursCapped = dailyRows.reduce((sum, row) => sum + row.hours, 0);
	const hoursRaw = allCommits.reduce((sum, commit) => sum + commit.dev_hours, 0);
	const cappedDays = dailyRows.filter((row) => row.note.includes('سقف')).length;

	return {
		ok: true,
		report: {
			rawCommits: allCommits,
			dailyRows,
			totals: {
				personDays: dailyRows.length,
				hoursCapped: Number(hoursCapped.toFixed(2)),
				hoursRaw: Number(hoursRaw.toFixed(2)),
				cappedDays,
				reposUsed,
				reposSkipped
			},
			params: summarizeParams(params),
			periods
		}
	};
}

export function dailyRowsToCsv(rows: DailyReportRow[]): string {
	const headers = [
		'ایمیل',
		'تاریخ',
		'دوره',
		'ریپازیتوری‌ها',
		'تعداد سشن',
		'تعداد کامیت',
		'زمان_تخمینی_ساعت',
		'پیام‌ها',
		'فایل‌ها (نمونه)',
		'تعداد فایل کل',
		'+خط کل',
		'-خط کل',
		'یادداشت'
	];

	const body = rows.map((row) =>
		[
			row.email,
			row.date,
			row.period,
			row.repos,
			row.sessions,
			row.commits,
			row.hours,
			row.messages,
			row.filesSample,
			row.fileCount,
			row.added,
			row.deleted,
			row.note
		]
			.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
			.join(',')
	);

	return `\uFEFF${[headers.join(','), ...body].join('\r\n')}\r\n`;
}
