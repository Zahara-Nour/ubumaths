<script lang="ts">
	/**
	 * CurveHover Component
	 *
	 * Displays point coordinates when hovering near a curve.
	 * Shows a marker and label when cursor is within snap threshold of a function curve.
	 *
	 * Features:
	 * - Snap to nearest curve point
	 * - Display (x, y) coordinates
	 * - Marker in function color
	 * - Instant snap (no animation)
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type { Plottable } from '$lib/grapheur/types';
	import { createEvaluator } from '$lib/grapheur/evaluator';

	// Props
	let {
		transformer,
		width,
		height
	}: {
		transformer: CoordinateTransformer;
		width: number;
		height: number;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Snap threshold in pixels */
	const SNAP_THRESHOLD = 20;

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/**
	 * Find the nearest curve point to the cursor.
	 * Returns null if cursor is not hovering or no curve is within threshold.
	 */
	const hoverPoint = $derived.by(() => {
		const cursor = grapheurStore.cursor;
		if (!cursor) return null;

		let nearestFunc: Plottable | null = null;
		let nearestY: number | null = null;
		let nearestDistance = Infinity;

		for (const func of grapheurStore.visibleFunctions) {
			if (!func.ast) continue;

			const evaluator = createEvaluator(func.ast);
			const y = evaluator(cursor.x);

			if (y === null) continue;

			// Calculate pixel distance from cursor to curve point
			const cursorSvg = transformer.mathToSvg(cursor.x, cursor.y);
			const pointSvg = transformer.mathToSvg(cursor.x, y);
			const distance = Math.abs(cursorSvg.y - pointSvg.y);

			if (distance < nearestDistance && distance < SNAP_THRESHOLD) {
				nearestFunc = func;
				nearestY = y;
				nearestDistance = distance;
			}
		}

		if (nearestFunc && nearestY !== null) {
			const svgPoint = transformer.mathToSvg(cursor.x, nearestY);
			return {
				func: nearestFunc,
				mathX: cursor.x,
				mathY: nearestY,
				svgX: svgPoint.x,
				svgY: svgPoint.y
			};
		}

		return null;
	});

	// ==========================================================================
	// Formatting
	// ==========================================================================

	/**
	 * Format a coordinate value for display.
	 */
	function formatCoord(n: number): string {
		if (Math.abs(n) < 0.0001 && n !== 0) {
			return n.toExponential(2);
		}
		if (Math.abs(n) >= 10000) {
			return n.toExponential(2);
		}
		if (Math.abs(n) < 0.0001) {
			return '0';
		}
		// Use toPrecision for 4 significant figures
		const formatted = n.toPrecision(4);
		// Remove trailing zeros after decimal point
		return parseFloat(formatted).toString();
	}

	/**
	 * Calculate tooltip position to keep it within bounds.
	 */
	function getTooltipPosition(
		svgX: number,
		svgY: number
	): { x: number; y: number; anchor: 'start' | 'end' } {
		const tooltipWidth = 120;
		const tooltipHeight = 20;
		const margin = 12;

		let tooltipX = svgX + margin;
		let anchor: 'start' | 'end' = 'start';

		// If too close to right edge, flip to left
		if (svgX + tooltipWidth + margin > width) {
			tooltipX = svgX - margin;
			anchor = 'end';
		}

		// Position above the point, unless too close to top or bottom
		let tooltipY = svgY - margin - 8;
		if (tooltipY < margin + tooltipHeight) {
			// Try below the point
			tooltipY = svgY + margin + tooltipHeight;
			// If still overflows bottom, clamp it
			if (tooltipY + tooltipHeight > height - margin) {
				tooltipY = height - tooltipHeight - margin;
			}
		}

		return { x: tooltipX, y: tooltipY, anchor };
	}
</script>

{#if hoverPoint}
	{@const tooltipPos = getTooltipPosition(hoverPoint.svgX, hoverPoint.svgY)}
	<g class="curve-hover" pointer-events="none">
		<!-- Marker circle -->
		<circle
			cx={hoverPoint.svgX}
			cy={hoverPoint.svgY}
			r={6}
			fill={hoverPoint.func.color}
			stroke="white"
			stroke-width={2}
			class="hover-marker"
		/>

		<!-- Coordinate label background -->
		<rect
			x={tooltipPos.anchor === 'start' ? tooltipPos.x : tooltipPos.x - 105}
			y={tooltipPos.y - 10}
			width={105}
			height={20}
			rx={4}
			class="tooltip-bg"
		/>

		<!-- Coordinate label text -->
		<text
			x={tooltipPos.anchor === 'start' ? tooltipPos.x + 6 : tooltipPos.x - 6}
			y={tooltipPos.y + 4}
			text-anchor={tooltipPos.anchor}
			class="tooltip-text"
		>
			({formatCoord(hoverPoint.mathX)}, {formatCoord(hoverPoint.mathY)})
		</text>
	</g>
{/if}

<style>
	.hover-marker {
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
	}

	.tooltip-bg {
		fill: var(--graph-tooltip-bg, #1f2937);
		opacity: 0.95;
	}

	.tooltip-text {
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
		font-size: 11px;
		fill: white;
		user-select: none;
	}

	:global(.dark) .tooltip-bg {
		fill: var(--graph-tooltip-bg-dark, #374151);
	}
</style>
