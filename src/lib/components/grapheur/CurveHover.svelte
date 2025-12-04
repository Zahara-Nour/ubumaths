<script lang="ts">
	/**
	 * CurveHover Component
	 *
	 * Displays point coordinates when hovering near a curve.
	 * Shows a marker and label when cursor is within snap threshold of a function curve.
	 *
	 * Features:
	 * - Snap to nearest curve point
	 * - PRIORITY snap to special points (roots, extrema, intersections)
	 * - Display (x, y) coordinates with point type label
	 * - Marker in function color (or gray for intersections)
	 * - Instant snap (no animation)
	 * - Updates store's snappedPoint for coordination with other components
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type { Plottable, SnappedPointType, SnappedPoint } from '$lib/grapheur/types';
	import { createEvaluator } from '$lib/grapheur/evaluator';
	import { analyzeAllFunctions } from '$lib/grapheur/analysis';
	import {
		findAllIntersections,
		deduplicateIntersections,
		type IntersectionResult
	} from '$lib/grapheur/intersections';

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

	/** Snap threshold in pixels for curve points */
	const SNAP_THRESHOLD = 20;

	/** Snap threshold in pixels for special points (slightly larger for priority) */
	const SPECIAL_POINT_SNAP_THRESHOLD = 25;

	/** Maximum functions for intersection detection */
	const MAX_FUNCTIONS_FOR_INTERSECTIONS = 10;

	// ==========================================================================
	// Special Points Computation
	// ==========================================================================

	/**
	 * Collect all special points (roots, extrema) from analysis.
	 * Computed only when not interacting.
	 */
	const analysisResults = $derived.by(() => {
		if (grapheurStore.isInteracting) return [];

		const functions = grapheurStore.functions
			.filter((f) => f.visible && f.ast)
			.map((f) => ({
				id: f.id,
				evaluator: createEvaluator(f.ast!)
			}));

		return analyzeAllFunctions(functions, grapheurStore.viewport);
	});

	/**
	 * Collect all intersection points.
	 * Computed only when not interacting.
	 */
	const intersections = $derived.by((): IntersectionResult[] => {
		if (grapheurStore.isInteracting) return [];

		const validFuncs = grapheurStore.functions
			.filter((f) => f.visible && f.ast !== undefined)
			.map((f) => ({
				id: f.id,
				evaluator: createEvaluator(f.ast!)
			}));

		if (validFuncs.length < 2 || validFuncs.length > MAX_FUNCTIONS_FOR_INTERSECTIONS) {
			return [];
		}

		const rawIntersections = findAllIntersections(validFuncs, grapheurStore.viewport);
		return deduplicateIntersections(rawIntersections, 0.01);
	});

	// ==========================================================================
	// Hover Point Detection
	// ==========================================================================

	/**
	 * Represents a candidate point to snap to
	 */
	interface SnapCandidate {
		mathX: number;
		mathY: number;
		svgX: number;
		svgY: number;
		distance: number;
		type: 'curve' | SnappedPointType;
		func: Plottable | null;
		functionIds: string[];
		color: string;
	}

	/**
	 * Find the best point to snap to: prioritizes special points over curve points.
	 * Returns null if cursor is not hovering or no point is within threshold.
	 */
	const hoverPoint = $derived.by(() => {
		const cursor = grapheurStore.cursor;
		if (!cursor) {
			return null;
		}

		const cursorSvg = transformer.mathToSvg(cursor.x, cursor.y);
		const candidates: SnapCandidate[] = [];

		// =======================================================================
		// 1. Check special points first (roots, extrema from analysis)
		// =======================================================================
		for (const analysis of analysisResults) {
			const func = grapheurStore.functions.find((f) => f.id === analysis.functionId);
			const color = func?.color ?? '#888';

			// Roots
			for (const root of analysis.roots) {
				const svgPoint = transformer.mathToSvg(root.x, 0);
				const dx = cursorSvg.x - svgPoint.x;
				const dy = cursorSvg.y - svgPoint.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < SPECIAL_POINT_SNAP_THRESHOLD) {
					candidates.push({
						mathX: root.x,
						mathY: 0,
						svgX: svgPoint.x,
						svgY: svgPoint.y,
						distance,
						type: 'root',
						func: func ?? null,
						functionIds: [analysis.functionId],
						color
					});
				}
			}

			// Extrema
			for (const extremum of analysis.extrema) {
				const svgPoint = transformer.mathToSvg(extremum.x, extremum.y);
				const dx = cursorSvg.x - svgPoint.x;
				const dy = cursorSvg.y - svgPoint.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < SPECIAL_POINT_SNAP_THRESHOLD) {
					candidates.push({
						mathX: extremum.x,
						mathY: extremum.y,
						svgX: svgPoint.x,
						svgY: svgPoint.y,
						distance,
						type: extremum.type,
						func: func ?? null,
						functionIds: [analysis.functionId],
						color
					});
				}
			}
		}

		// =======================================================================
		// 2. Check intersection points
		// =======================================================================
		for (const intersection of intersections) {
			const svgPoint = transformer.mathToSvg(intersection.point.x, intersection.point.y);
			const dx = cursorSvg.x - svgPoint.x;
			const dy = cursorSvg.y - svgPoint.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < SPECIAL_POINT_SNAP_THRESHOLD) {
				candidates.push({
					mathX: intersection.point.x,
					mathY: intersection.point.y,
					svgX: svgPoint.x,
					svgY: svgPoint.y,
					distance,
					type: 'intersection',
					func: null,
					functionIds: [...intersection.functionIds],
					color: '#6b7280' // Gray for intersections
				});
			}
		}

		// =======================================================================
		// 3. Check curve points (regular hover on curve)
		// =======================================================================
		for (const func of grapheurStore.functions) {
			if (!func.visible || !func.ast) continue;

			const evaluator = createEvaluator(func.ast);
			const y = evaluator(cursor.x);

			if (y === null) continue;

			const pointSvg = transformer.mathToSvg(cursor.x, y);
			const distance = Math.abs(cursorSvg.y - pointSvg.y);

			if (distance < SNAP_THRESHOLD) {
				candidates.push({
					mathX: cursor.x,
					mathY: y,
					svgX: pointSvg.x,
					svgY: pointSvg.y,
					distance,
					type: 'curve',
					func,
					functionIds: [func.id],
					color: func.color
				});
			}
		}

		// =======================================================================
		// 4. Select best candidate
		// =======================================================================
		if (candidates.length === 0) {
			return null;
		}

		// Sort by priority: special points first, then by distance
		// Priority order: intersection > root > max/min > curve
		const priorityOrder: Record<string, number> = {
			intersection: 0,
			root: 1,
			max: 2,
			min: 2,
			curve: 3
		};

		candidates.sort((a, b) => {
			const priorityDiff = priorityOrder[a.type] - priorityOrder[b.type];
			if (priorityDiff !== 0) {
				// Only use priority if both are within threshold
				// and the priority difference is significant
				if (
					a.distance < SPECIAL_POINT_SNAP_THRESHOLD &&
					b.distance < SPECIAL_POINT_SNAP_THRESHOLD
				) {
					return priorityDiff;
				}
			}
			// Otherwise, prefer closer points
			return a.distance - b.distance;
		});

		return candidates[0];
	});

	/**
	 * Update the store's snapped point when hoverPoint changes.
	 * This is done in an effect because it's a side effect.
	 */
	$effect(() => {
		if (!hoverPoint) {
			grapheurStore.setSnappedPoint(null);
			return;
		}

		if (hoverPoint.type !== 'curve') {
			const newSnapped: SnappedPoint = {
				x: hoverPoint.mathX,
				y: hoverPoint.mathY,
				type: hoverPoint.type as SnappedPointType,
				functionIds: hoverPoint.functionIds
			};
			grapheurStore.setSnappedPoint(newSnapped);
		} else {
			grapheurStore.setSnappedPoint(null);
		}
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

	/**
	 * Get the label text for a hover point based on its type.
	 */
	function getLabel(point: SnapCandidate): string {
		switch (point.type) {
			case 'root':
				return `Racine : x = ${formatCoord(point.mathX)}`;
			case 'max':
				return `Max : (${formatCoord(point.mathX)}, ${formatCoord(point.mathY)})`;
			case 'min':
				return `Min : (${formatCoord(point.mathX)}, ${formatCoord(point.mathY)})`;
			case 'intersection':
				return `Inter : (${formatCoord(point.mathX)}, ${formatCoord(point.mathY)})`;
			default:
				return `(${formatCoord(point.mathX)}, ${formatCoord(point.mathY)})`;
		}
	}

	/**
	 * Get the marker path based on point type.
	 */
	function getMarkerPath(x: number, y: number, type: string): string {
		const size = 8;
		const half = size / 2;
		const triangleHeight = size * 0.866;

		switch (type) {
			case 'root':
				// Diamond
				return `M ${x} ${y - half} L ${x + half} ${y} L ${x} ${y + half} L ${x - half} ${y} Z`;
			case 'max':
				// Triangle up
				return `M ${x} ${y - triangleHeight / 2} L ${x + half} ${y + triangleHeight / 2} L ${x - half} ${y + triangleHeight / 2} Z`;
			case 'min':
				// Triangle down
				return `M ${x} ${y + triangleHeight / 2} L ${x + half} ${y - triangleHeight / 2} L ${x - half} ${y - triangleHeight / 2} Z`;
			default:
				// Circle will be used for intersection and curve
				return '';
		}
	}

	/**
	 * Calculate tooltip position to keep it within bounds.
	 */
	function getTooltipPosition(
		svgX: number,
		svgY: number,
		labelLength: number
	): { x: number; y: number; anchor: 'start' | 'end' } {
		const tooltipWidth = Math.max(105, labelLength * 7);
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
	{@const label = getLabel(hoverPoint)}
	{@const tooltipPos = getTooltipPosition(hoverPoint.svgX, hoverPoint.svgY, label.length)}
	{@const markerPath = getMarkerPath(hoverPoint.svgX, hoverPoint.svgY, hoverPoint.type)}
	{@const tooltipWidth = Math.max(105, label.length * 7)}
	<g class="curve-hover" pointer-events="none">
		<!-- Marker: shaped based on point type -->
		{#if markerPath}
			<!-- Special point marker (diamond, triangle) -->
			<path
				d={markerPath}
				fill={hoverPoint.color}
				stroke="white"
				stroke-width={2}
				class="hover-marker"
			/>
		{:else}
			<!-- Circle marker for curve and intersection points -->
			<circle
				cx={hoverPoint.svgX}
				cy={hoverPoint.svgY}
				r={6}
				fill={hoverPoint.color}
				stroke="white"
				stroke-width={2}
				class="hover-marker"
			/>
		{/if}

		<!-- Coordinate label background -->
		<rect
			x={tooltipPos.anchor === 'start' ? tooltipPos.x : tooltipPos.x - tooltipWidth}
			y={tooltipPos.y - 10}
			width={tooltipWidth}
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
			{label}
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
