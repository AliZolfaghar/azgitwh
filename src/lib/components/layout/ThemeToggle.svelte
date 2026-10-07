<script lang="ts">
	import { applyTheme, getPreferredTheme, toggleTheme, type Theme } from '#lib/theme.js';
	import { onMount } from 'svelte';
	import { iconMoon, iconSun } from './icons.js';

	let theme = $state<Theme>('light');

	onMount(() => {
		theme = getPreferredTheme();
		applyTheme(theme);
	});

	function onToggle() {
		theme = toggleTheme(theme);
		applyTheme(theme);
	}
</script>

<button
	type="button"
	class="icon-btn"
	aria-label={theme === 'dark' ? 'تغییر به تم روشن' : 'تغییر به تم تاریک'}
	title={theme === 'dark' ? 'تم روشن' : 'تم تاریک'}
	onclick={onToggle}
>
	{@html theme === 'dark' ? iconSun : iconMoon}
</button>
