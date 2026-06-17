<script lang="ts">
	/**
	 * ToolButton - Reusable tool button with active state and tooltip
	 *
	 * Used in FloatingToolbar for consistent tool button styling.
	 * Uses native title attribute for tooltip (no provider needed).
	 */

	import { Button } from '$lib/components/ui/button';
	// lucide-svelte v0.545 exports Svelte 4 class-based components (SvelteComponentTyped),
	// not Svelte 5 Component<Props> interface. Use typeof to accept the class constructor.
	import type { Icon as LucideIcon } from '@lucide/svelte';

	interface Props {
		/** Lucide icon component */
		icon: typeof LucideIcon;
		/** Whether the tool is currently active */
		active?: boolean;
		/** Tooltip label */
		label: string;
		/** Keyboard shortcut (displayed in tooltip) */
		shortcut?: string;
		/** Click handler */
		onclick: () => void;
		/** Whether the button is disabled */
		disabled?: boolean;
		/** Optional class for styling */
		class?: string;
	}

	let {
		icon: IconComponent,
		active = false,
		label,
		shortcut,
		onclick,
		disabled = false,
		class: className = ''
	}: Props = $props();

	let tooltipContent = $derived(shortcut ? `${label} (${shortcut})` : label);
</script>

<Button
	type="button"
	variant={active ? 'default' : 'ghost'}
	size="icon"
	{onclick}
	{disabled}
	title={tooltipContent}
	aria-label={label}
	aria-pressed={active}
	class="h-9 w-9 shrink-0 {active ? 'ring-2 ring-primary ring-offset-1' : ''} {className}"
>
	<IconComponent class="h-4 w-4" />
</Button>
