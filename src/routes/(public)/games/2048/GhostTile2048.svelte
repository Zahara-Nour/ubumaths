<script lang="ts">
	/**
	 * Ghost tile component for 2048 game merge animations
	 * These tiles slide from their original position to the merge destination
	 * then disappear as the merged tile appears
	 */
	import type { GhostTile } from './types';

	// Props
	let { ghost } = $props<{
		ghost: GhostTile;
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
	 */
	function getFontSize(value: number): string {
		if (value < 100) return 'text-3xl sm:text-4xl';
		if (value < 1000) return 'text-2xl sm:text-3xl';
		if (value < 10000) return 'text-xl sm:text-2xl';
		return 'text-lg sm:text-xl';
	}
</script>

<div
	class="ghost-tile flex h-16 w-16 items-center justify-center rounded-lg shadow-md sm:h-20 sm:w-20 {getTileColor(
		ghost.value
	)}"
	style="--from-row: {ghost.fromPosition.row}; --from-col: {ghost.fromPosition
		.col}; --to-row: {ghost.toPosition.row}; --to-col: {ghost.toPosition.col};"
>
	<span class="leading-none font-bold {getFontSize(ghost.value)}">
		{ghost.displayValue || ghost.value}
	</span>
</div>

<style>
	.ghost-tile {
		position: absolute;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		z-index: 5; /* Below regular tiles (z-index: 10) */

		/* Responsive grid size: mobile 72px, desktop 92px */
		--grid-size: 72px;

		/* Start at fromPosition, animate to toPosition
		 * Duration (300ms) must be kept in sync with GHOST_SLIDE_DURATION in Game2048.svelte */
		animation: ghost-slide 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
	}

	/* Responsive positioning for larger screens */
	@media (min-width: 640px) {
		.ghost-tile {
			--grid-size: 92px;
		}
	}

	@keyframes ghost-slide {
		from {
			transform: translate(
				calc(var(--from-col) * var(--grid-size)),
				calc(var(--from-row) * var(--grid-size))
			);
			opacity: 1;
		}
		to {
			transform: translate(
				calc(var(--to-col) * var(--grid-size)),
				calc(var(--to-row) * var(--grid-size))
			);
			opacity: 0.7;
		}
	}

	/* Accessibility: Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.ghost-tile {
			animation: none;
			transform: translate(
				calc(var(--to-col) * var(--grid-size)),
				calc(var(--to-row) * var(--grid-size))
			);
			opacity: 0.7;
		}
	}
</style>
