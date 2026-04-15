<script lang="ts">
	/**
	 * Individual tile component for 2048 game
	 * Displays tile value with appropriate colors and optional power notation
	 *
	 * ## Animation architecture (IMPORTANT — do NOT change positioning to transform)
	 *
	 * Tiles are positioned with `left`/`top`, NOT `transform: translate()`.
	 * This separation is critical to avoid the (0,0) slide bug:
	 *
	 * **The bug**: When Svelte creates a new DOM element (new/merged tile with a
	 * new ID), if positioning uses `transform: translate(...)`, the browser may
	 * paint one frame at translate(0,0) before the CSS animation (`scale: 0`)
	 * takes effect. This causes a visible flash/slide from the top-left corner.
	 * 8 different approaches were tried (CSS transitions, requestAnimationFrame,
	 * $effect.pre two-phase, etc.) — none solved it reliably.
	 *
	 * **The fix**: Separate positioning from animation:
	 * - `left`/`top` (CSS)         → immediate positioning, no animation conflict
	 * - `scale`/`opacity` (CSS)     → appear/merge pop-in animations
	 * - `transform` (Web Animations API) → slide animation for moving tiles
	 *
	 * **Slide animation**: The component tracks position changes via two $effects:
	 * 1. `$effect.pre` captures old/new position BEFORE the DOM update
	 * 2. `$effect` runs AFTER the DOM update, applying a Web Animations API
	 *    animation from `translate(delta)` → `translate(0,0)` where delta is
	 *    the offset between old and new position. This works because left/top
	 *    already placed the element at its new position.
	 *
	 * For new/merged tiles, prevRow/prevCol are undefined on first render,
	 * so no slide animation is triggered — only the CSS scale/opacity animation.
	 */
	import type { Tile } from './types';
	import { getPowerNotation } from './game-utils';

	let {
		tile,
		showPowerNotation = false,
		bombTarget = false,
		onBombClick
	} = $props<{
		tile: Tile;
		showPowerNotation?: boolean;
		bombTarget?: boolean;
		onBombClick?: (row: number, col: number) => void;
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
	// is at its new CSS position (left/top). element.animate() overrides
	// transform for the duration, creating a smooth slide from old → new.
	$effect(() => {
		// Re-read position to create a reactive dependency matching phase 1
		const _row = tile.position.row;
		const _col = tile.position.col;
		void _row;
		void _col;

		if (tileEl && pendingSlide) {
			const gs = parseFloat(getComputedStyle(tileEl).getPropertyValue('--grid-size'));
			const { fromRow, fromCol, toRow, toCol } = pendingSlide;
			// Animate from the offset (old position relative to new) back to (0,0)
			const deltaCol = fromCol - toCol;
			const deltaRow = fromRow - toRow;
			tileEl.animate(
				[
					{ transform: `translate(${deltaCol * gs}px, ${deltaRow * gs}px)` },
					{ transform: 'translate(0, 0)' }
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
	class:tile-bomb-target={bombTarget}
	style="--row: {tile.position.row}; --col: {tile.position.col};"
	onclick={bombTarget ? () => onBombClick?.(tile.position.row, tile.position.col) : undefined}
	onkeydown={bombTarget
		? (e) => {
				if (e.key === 'Enter' || e.key === ' ') onBombClick?.(tile.position.row, tile.position.col);
			}
		: undefined}
	role={bombTarget ? 'button' : undefined}
	tabindex={bombTarget ? 0 : undefined}
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

		/* Position via left/top — NOT transform. This avoids the (0,0) slide bug:
		 * new DOM elements get their correct position immediately, and CSS animations
		 * (scale/opacity) don't conflict with a transform-based position. */
		left: calc(var(--col) * var(--grid-size));
		top: calc(var(--row) * var(--grid-size));

		/* Sliding is done via Web Animations API (transform from offset → 0).
		 * No CSS transition on position properties — they change instantly. */
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

	/* Bomb target mode: pulsing red ring + pointer cursor */
	.tile-bomb-target {
		cursor: pointer;
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.7);
		animation: bomb-pulse 1s ease-in-out infinite;
		z-index: 20;
	}

	@keyframes bomb-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.7);
		}
		50% {
			box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.4);
		}
	}

	/* Accessibility: Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.tile {
			transition: none;
			animation: none !important;
		}

		.tile-bomb-target {
			animation: none !important;
			box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.7);
		}
	}
</style>
