<script lang="ts">
	/**
	 * Tile Component - Individual grid cell for Trio game
	 *
	 * Displays a numbered tile with different states:
	 * - Default: Neutral background, clickable
	 * - Selected (1st/2nd): Secondary color with shadow
	 * - Selected Third: Accent color (different to highlight 3rd cell)
	 * - Not Available: Dimmed and disabled
	 *
	 * Props:
	 * @param n - Number to display (1-9)
	 * @param status - Cell state: '', 'selected', 'selected-third', or 'not_available'
	 * @param onclick - Click handler function
	 */
	let { n, status = '', onclick }: { n: number; status?: string; onclick?: () => void } = $props();

	// Derived boolean flags for each state
	const isSelected = $derived(status === 'selected');
	const isSelectedThird = $derived(status === 'selected-third');
	const isNotAvailable = $derived(status === 'not_available');
</script>

<button
	class="flex h-12 w-12 items-center justify-center rounded-lg text-3xl font-bold transition-all md:h-16 md:w-16 md:text-5xl
		{isSelected
		? 'bg-secondary text-secondary-foreground shadow-lg'
		: isSelectedThird
			? 'bg-accent text-accent-foreground shadow-lg'
			: 'bg-neutral text-neutral-foreground  hover:brightness-150'}
		{isNotAvailable
		? 'cursor-not-allowed opacity-20 hover:hover:brightness-100'
		: 'cursor-pointer hover:scale-105'}"
	style="font-family:'Baloo 2', sans-serif;"
	{onclick}
	disabled={isNotAvailable}
>
	{n}
</button>
