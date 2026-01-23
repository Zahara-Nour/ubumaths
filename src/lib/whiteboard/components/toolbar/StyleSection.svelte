<script lang="ts">
	/**
	 * StyleSection - Collapsible section for StylePanel
	 *
	 * Groups related style controls with a title and optional collapse behavior.
	 */

	import { ChevronDown } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Section title */
		title: string;
		/** Whether section is expanded by default */
		defaultOpen?: boolean;
		/** Whether section is collapsible */
		collapsible?: boolean;
		/** Content slot */
		children: Snippet;
		/** Optional class for styling */
		class?: string;
	}

	let {
		title,
		defaultOpen = true,
		collapsible = true,
		children,
		class: className = ''
	}: Props = $props();

	// Use closure to properly capture defaultOpen value
	let isOpen = $state<boolean>(true);
	$effect(() => {
		// Initialize on mount - untrack to avoid re-running
		isOpen = defaultOpen;
	});

	function toggle() {
		if (collapsible) {
			isOpen = !isOpen;
		}
	}
</script>

<div class="style-section {className}">
	<button
		type="button"
		onclick={toggle}
		class="flex w-full items-center justify-between py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		class:cursor-default={!collapsible}
		aria-expanded={isOpen}
	>
		<span>{title}</span>
		{#if collapsible}
			<ChevronDown
				class="h-3.5 w-3.5 transition-transform duration-200"
				style="transform: rotate({isOpen ? 0 : -90}deg)"
			/>
		{/if}
	</button>

	{#if isOpen}
		<div class="pb-2">
			{@render children()}
		</div>
	{/if}
</div>
