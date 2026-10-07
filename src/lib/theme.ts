export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'azgitwh-theme';

export function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
}

export function getPreferredTheme(): Theme {
	if (typeof window === 'undefined') return 'light';

	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (isTheme(stored)) return stored;

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleTheme(current: Theme): Theme {
	return current === 'dark' ? 'light' : 'dark';
}
