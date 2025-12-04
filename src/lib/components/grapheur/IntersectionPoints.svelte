<script lang="ts">
	/**
	 * IntersectionPoints Component
	 *
	 * Displays intersection points between function curves.
	 * Shows markers at intersection points with hover tooltips.
	 *
	 * Features:
	 * - Reactive computation when functions/viewport change
	 * - Skip computation during interaction (performance)
	 * - Hover to show coordinates
	 * - Gray neutral color to distinguish from function colors
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { createEvaluator } from '$lib/grapheur/evaluator';
	import {
		findAllIntersections,
		deduplicateIntersections,
		type IntersectionResult
	} from '$lib/grapheur/intersections';

	// Props
	let {
		transformer
	}: {
		transformer: CoordinateTransformer;
	} = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Index of currently hovered intersection */
	let hoveredIndex = $state<number | null>(null);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Maximum functions for intersection detection (O(n²) performance) */
	const MAX_FUNCTIONS_FOR_INTERSECTIONS = 10;

	/**
	 * Compute all intersection points.
	 * Skips computation during interaction for performance.
	 * Limited to 10 functions to avoid O(n²) performance issues.
	 */
	const intersections = $derived.by((): IntersectionResult[] => {
		// Skip during interaction for performance
		if (grapheurStore.isInteracting) {
			return [];
		}

		const validFuncs = grapheurStore.visibleFunctions
			.filter((f) => f.ast !== undefined)
			.map((f) => ({
				id: f.id,
				evaluator: createEvaluator(f.ast!)
			}));

		// Need at least 2 functions, but limit to avoid performance issues
		if (validFuncs.length < 2 || validFuncs.length > MAX_FUNCTIONS_FOR_INTERSECTIONS) {
			return [];
		}

		const rawIntersections = findAllIntersections(validFuncs, grapheurStore.viewport);

		// Deduplicate points that are too close
		return deduplicateIntersections(rawIntersections, 0.01);
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
		const formatted = n.toPrecision(4);
		return parseFloat(formatted).toString();
	}
</script>

{#if intersections.length > 0}
	<g class="intersection-points" role="group" aria-label="Points d'intersection">
		{#each intersections as { point }, i (i)}
			{@const svgPoint = transformer.mathToSvg(point.x, point.y)}
			<g
				class="intersection-marker"
				onpointerenter={() => (hoveredIndex = i)}
				onpointerleave={() => (hoveredIndex = null)}
				role="img"
				aria-label="Intersection: ({formatCoord(point.x)}, {formatCoord(point.y)})"
			>
				<!-- Invisible hit area for easier hover -->
				<circle cx={svgPoint.x} cy={svgPoint.y} r={12} fill="transparent" class="hit-area" />

				<!-- Visible marker -->
				<circle
					cx={svgPoint.x}
					cy={svgPoint.y}
					r={hoveredIndex === i ? 6 : 4}
					class="marker"
					class:hovered={hoveredIndex === i}
				/>

				<!-- Tooltip on hover -->
				{#if hoveredIndex === i}
					<g class="tooltip">
						<rect
							x={svgPoint.x + 10}
							y={svgPoint.y - 26}
							width={105}
							height={20}
							rx={4}
							class="tooltip-bg"
						/>
						<text x={svgPoint.x + 16} y={svgPoint.y - 12} class="tooltip-text">
							({formatCoord(point.x)}, {formatCoord(point.y)})
						</text>
					</g>
				{/if}
			</g>
		{/each}
	</g>
{/if}

<style>
	.marker {
		fill: var(--graph-intersection, #6b7280);
		stroke: white;
		stroke-width: 2;
		transition: r 0.15s ease-out;
		cursor: pointer;
	}

	.marker.hovered {
		fill: var(--graph-intersection-hover, #374151);
	}

	.hit-area {
		cursor: pointer;
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

	/* Dark mode */
	:global(.dark) .marker {
		fill: var(--graph-intersection-dark, #9ca3af);
	}

	:global(.dark) .marker.hovered {
		fill: var(--graph-intersection-hover-dark, #d1d5db);
	}

	:global(.dark) .tooltip-bg {
		fill: var(--graph-tooltip-bg-dark, #374151);
	}
</style>
