<script lang="ts">
	/**
	 * Bug Report Floating Action Button
	 *
	 * A small ant icon button fixed in the bottom-right corner.
	 * Clicking it opens the bug report dialog.
	 */
	import { cn } from '$lib/utils';
	import { Bug } from 'lucide-svelte';

	interface Props {
		onclick: () => void;
		class?: string;
	}

	let { onclick, class: className }: Props = $props();
</script>

<button
	type="button"
	{onclick}
	class={cn(
		'fixed right-6 bottom-6 z-50',
		'flex h-12 w-12 items-center justify-center',
		'rounded-full bg-primary text-primary-foreground',
		'shadow-lg hover:bg-primary/90 hover:shadow-xl',
		'transition-all duration-200',
		'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none',
		className
	)}
	aria-label="Signaler un problème"
	title="Signaler un problème"
>
	<!-- Ant/Bug icon -->
	<Bug class="h-5 w-5" />
</button>
