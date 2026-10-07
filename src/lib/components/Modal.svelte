<script lang="ts">
	import { fadeFast, fadeUpFast } from '#lib/motion.js';
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
		wide?: boolean;
	}

	let { open, title, onclose, children, footer, wide = false }: Props = $props();

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		document.body.classList.add('modal-open');
		return {
			destroy() {
				document.body.classList.remove('modal-open');
				node.remove();
			}
		};
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="بستن پنجره"
		onclick={onclose}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				onclose();
			}
		}}
		use:portal
		transition:fade={fadeFast}
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="modal-dialog"
			class:modal-wide={wide}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={title}
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
			transition:fly={fadeUpFast}
		>
			<header class="modal-header">
				<h2 class="modal-title">{title}</h2>
				<button type="button" class="icon-btn modal-close" aria-label="بستن" onclick={onclose}>
					✕
				</button>
			</header>
			<div class="modal-body">
				{@render children()}
			</div>
			{#if footer}
				<footer class="modal-footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
