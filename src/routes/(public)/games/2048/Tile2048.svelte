<script lang="ts">
	/**
	 * Individual tile component for 2048 game
	 * Displays tile value with appropriate colors and optional power notation
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
	class="tile flex h-16 w-16 flex-col items-center justify-center rounded-lg shadow-md transition-all duration-200 sm:h-20 sm:w-20 {getTileColor(
		tile.value
	)}"
>
	<span class="leading-none font-bold {getFontSize(tile.value)}">{tile.value}</span>
	{#if showPowerNotation && tile.value >= 4}
		<span class="mt-1 text-xs opacity-70">{getPowerNotation(tile.value)}</span>
	{/if}
</div>

<style>
	.tile {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
	}
</style>
