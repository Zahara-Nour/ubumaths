<script lang="ts">
	/**
	 * Individual tile component for 2048 game
	 * Displays tile value with appropriate colors and optional power notation
	 *
	 * Slide animation: tracked internally via $effect + Web Animations API.
	 * The component remembers its previous position and animates to the new one
	 * whenever the position changes. This avoids all CSS transition/animation
	 * restart issues because element.animate() always creates a fresh instance.
	 */
	import type { Tile } from './types';
	import { getPowerNotation } from './game-utils';

	let { tile, showPowerNotation = false } = $props<{
		tile: Tile;
		showPowerNotation?: boolean;
	}>();

	let tileEl: HTMLElement;

	// Pending animation data: captured before DOM update, consumed after.
	let pendingSlide: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null =
		null;

	// Track previous position as plain (non-reactive) closure variables.
	let prevRow: number | undefined;
	let prevCol: number | undefined;

	// Phase 1 (before DOM update): detect position change and capture from/to.
	$effect.pre(() => {
		const row = tile.position.row;
		const col = tile.position.col;

		if (prevRow !== undefined && prevCol !== undefined && (prevRow !== row || prevCol !== col)) {
			pendingSlide = { fromRow: prevRow, fromCol: prevCol, toRow: row, toCol: col };
		}

		prevRow = row;
		prevCol = col;
	});

	// Phase 2 (after DOM update): run the animation now that the element
	// is at its new CSS position. element.animate() overrides the visual
	// transform for the duration, creating a smooth slide.
	$effect(() => {
		// Re-read position to create a reactive dependency matching phase 1
		const _row = tile.position.row;
		const _col = tile.position.col;
		void _row;
		void _col;

		if (tileEl && pendingSlide) {
			const gs = parseFloat(getComputedStyle(tileEl).getPropertyValue('--grid-size'));
			const { fromRow, fromCol, toRow, toCol } = pendingSlide;
			tileEl.animate(
				[
					{ transform: `translate(${fromCol * gs}px, ${fromRow * gs}px)` },
					{ transform: `translate(${toCol * gs}px, ${toRow * gs}px)` }
				],
				{ duration: 150, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
			);
			pendingSlide = null;
		}
	});

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

	function getFontSize(value: number): string {
		if (value < 100) return 'text-3xl sm:text-4xl';
		if (value < 1000) return 'text-2xl sm:text-3xl';
		if (value < 10000) return 'text-xl sm:text-2xl';
		return 'text-lg sm:text-xl';
	}
</script>

<div
	bind:this={tileEl}
	class="tile flex h-16 w-16 flex-col items-center justify-center rounded-lg shadow-md sm:h-20 sm:w-20 {getTileColor(
		tile.value
	)}"
	class:tile-new={tile.isNew}
	class:tile-merged={tile.mergedFrom && tile.mergedFrom.length > 0}
	style="--row: {tile.position.row}; --col: {tile.position.col};"
>
	<span class="leading-none font-bold {getFontSize(tile.value)}">
		{tile.value}
	</span>
	{#if showPowerNotation && tile.value >= 4}
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

		/* Mobile/base: tile size 64px (4rem) + gap 8px (0.5rem) = 72px total */
		/* Desktop/sm: tile size 80px (5rem) + gap 12px (0.75rem) = 92px total */
		transform: translate(calc(var(--col) * var(--grid-size)), calc(var(--row) * var(--grid-size)));

		/* No CSS transition on transform — sliding is done via Web Animations API
		 * in the $effect above, which creates a new animation instance each time. */
		transition:
			background-color 200ms ease-in-out,
			color 200ms ease-in-out;
	}

	@media (min-width: 640px) {
		.tile {
			--grid-size: 92px;
		}
	}

	/* New tile: scale up from 0.
	 * Delay matches slide duration so tile appears after others finish sliding.
	 * Only plays once (new DOM element), no restart issue. */
	.tile-new {
		animation: tile-appear 150ms ease-out 150ms backwards;
	}

	@keyframes tile-appear {
		from {
			scale: 0;
			opacity: 0;
		}
		to {
			scale: 1;
			opacity: 1;
		}
	}

	/* Merged tile: pop-in effect after ghost tiles finish sliding.
	 * The delay must match GHOST_SLIDE_DURATION in Game2048.svelte.
	 * Only plays once (new DOM element), no restart issue. */
	.tile-merged {
		animation: tile-merge-appear 200ms ease-out 150ms backwards;
	}

	@keyframes tile-merge-appear {
		0% {
			scale: 0;
			opacity: 0;
		}
		60% {
			scale: 1.15;
			opacity: 1;
		}
		100% {
			scale: 1;
			opacity: 1;
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
