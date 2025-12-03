<script lang="ts">
	/**
	 * CoordinatesDisplay Component
	 *
	 * Displays the current cursor position in mathematical coordinates.
	 * Shows only when cursor is hovering over the graph.
	 *
	 * Formatting:
	 * - Values near zero (< 1e-6) show as "0"
	 * - Very large values (>= 1e6) use exponential notation
	 * - Normal values use fixed-point with adaptive precision
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';

	// ==========================================================================
	// Formatting
	// ==========================================================================

	/**
	 * Format a coordinate value for display
	 *
	 * @param n - The number to format
	 * @returns Formatted string (max 6 decimal places)
	 */
	function formatCoord(n: number): string {
		// Handle near-zero values
		if (Math.abs(n) < 0.000001) return '0';

		// Handle very large values with exponential notation
		if (Math.abs(n) >= 1000000) return n.toExponential(2);

		// Adaptive precision based on magnitude
		// For values < 1, use more decimal places
		const precision = Math.max(0, 4 - Math.floor(Math.log10(Math.abs(n) || 1)));
		return n.toFixed(Math.min(precision, 6));
	}
</script>

{#if grapheurStore.cursor}
	<div
		class="coordinates-display flex gap-4 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
		role="status"
		aria-live="polite"
		aria-label="Coordonnées du curseur"
	>
		<span class="coord">
			<span class="coord-label text-muted-foreground">x =</span>
			<span class="coord-value">{formatCoord(grapheurStore.cursor.x)}</span>
		</span>
		<span class="coord">
			<span class="coord-label text-muted-foreground">y =</span>
			<span class="coord-value">{formatCoord(grapheurStore.cursor.y)}</span>
		</span>
	</div>
{/if}

<style>
	.coordinates-display {
		user-select: none;
		min-width: 200px;
	}

	.coord {
		display: inline-flex;
		gap: 0.5rem;
		align-items: baseline;
	}

	.coord-value {
		font-weight: 600;
		min-width: 4rem;
		text-align: right;
	}
</style>
