<script lang="ts">
	/**
	 * Individual tile component for 2048 game
	 * Displays tile value with appropriate colors and optional power notation
	 * Includes smooth CSS animations for movement, appearance, and merge
	 */
	import type { Tile } from './types';
	import { getPowerNotation } from './game-utils';

	// Props
	let { tile, showPowerNotation = false } = $props<{
		tile: Tile;
		showPowerNotation?: boolean;
	}>();

	/**
	 * Returns Tailwind classes for tile background and text color based on value
	 */
	function getTileColor(value: number): string {
		const colors: Record<number, string> = {
			2: 'bg-amber-100 text-gray-800',
			4: 'bg-amber-200 text-gray-800',
			8: 'bg-orange-400 text-white',
			16: 'bg-orange-500 text-white',
			32: 'bg-red-500 text-white',
			64: 'bg-red-600 text-white',
			128: 'bg-yellow-400 text-white',
			256: 'bg-yellow-500 text-white',
			512: 'bg-yellow-600 text-white',
			1024: 'bg-yellow-700 text-white',
			2048: 'bg-amber-500 text-white font-extrabold',
			4096: 'bg-amber-600 text-white font-extrabold',
			8192: 'bg-amber-700 text-white font-extrabold'
		};
		return colors[value] || 'bg-amber-700 text-white font-extrabold';
	}

	/**
	 * Returns responsive font size classes based on tile value
	 * Smaller tiles use larger fonts, bigger tiles use smaller fonts
	 */
	function getFontSize(value: number): string {
		if (value < 100) return 'text-3xl sm:text-4xl';
		if (value < 1000) return 'text-2xl sm:text-3xl';
		if (value < 10000) return 'text-xl sm:text-2xl';
		return 'text-lg sm:text-xl';
	}
</script>

<div
	class="tile flex h-16 w-16 flex-col items-center justify-center rounded-lg shadow-md sm:h-20 sm:w-20 {getTileColor(
		tile.value
	)}"
	class:tile-new={tile.isNew}
	class:tile-merged={tile.mergedFrom && tile.mergedFrom.length > 0}
	style="--row: {tile.position.row}; --col: {tile.position.col};"
>
	<span class="leading-none font-bold {getFontSize(tile.value)}">
		{tile.displayValue || tile.value}
	</span>
	{#if showPowerNotation && !tile.displayValue && tile.value >= 4}
		<span class="mt-1 text-xs opacity-70">{getPowerNotation(tile.value)}</span>
	{/if}
</div>

<style>
	.tile {
		position: absolute;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		z-index: 10;

		/* Responsive grid size: mobile 72px, desktop 92px */
		--grid-size: 72px;

		/* Smooth movement animation via transform */
		/* Mobile/base: tile size 64px (4rem) + gap 8px (0.5rem) = 72px total */
		/* Desktop/sm: tile size 80px (5rem) + gap 12px (0.75rem) = 92px total */
		transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)));

		/* Smooth transitions for color changes only (not transform to avoid animation conflicts) */
		transition:
			background-color 200ms ease-in-out,
			color 200ms ease-in-out;
	}

	/* Responsive positioning for larger screens */
	@media (min-width: 640px) {
		.tile {
			--grid-size: 92px;
		}
	}

	/* Smooth transform transition for movement (separate from animations) */
	.tile:not(.tile-new):not(.tile-merged) {
		transition:
			transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
			background-color 200ms ease-in-out,
			color 200ms ease-in-out;
	}

	/* New tile appearance animation - scale up from 0 */
	.tile-new {
		animation: tile-appear 200ms ease-out;
	}

	@keyframes tile-appear {
		from {
			transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)))
				scale(0);
			opacity: 0;
		}
		to {
			transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)))
				scale(1);
			opacity: 1;
		}
	}

	/* Merge animation - pulse effect */
	.tile-merged {
		animation: tile-merge 300ms ease-in-out;
	}

	@keyframes tile-merge {
		0%,
		100% {
			transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)))
				scale(1);
		}
		50% {
			transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)))
				scale(1.1);
		}
	}

	/* Accessibility: Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.tile {
			transition: none;
			animation: none !important;
		}
	}
</style>
