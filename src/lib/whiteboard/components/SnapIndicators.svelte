<script lang="ts">
	/**
	 * SnapIndicators - Visual feedback for snap alignment
	 *
	 * Renders snap lines when elements are being dragged and snap to other elements.
	 * Shows dashed lines connecting aligned points.
	 *
	 * @module whiteboard/components/SnapIndicators
	 */

	import type { PointsSnapIndicator } from '../core/snapping';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Array of snap indicators to display */
		indicators: PointsSnapIndicator[];
		/** Current canvas scale (for consistent line width) */
		scale: number;
	}

	let { indicators, scale }: Props = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Snap line color (blue-500) */
	const SNAP_LINE_COLOR = '#3b82f6';

	/** Snap point indicator radius */
	const SNAP_POINT_RADIUS = 3;

	// ==========================================================================
	// Helpers
	// ==========================================================================

	/**
	 * Calculate the line endpoints for a snap indicator.
	 * The line connects the min and max points on the appropriate axis.
	 */
	function getSnapLineCoords(indicator: PointsSnapIndicator): {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		isVertical: boolean;
	} | null {
		const { points } = indicator;
		if (points.length < 2) return null;

		// Determine if this is a vertical or horizontal snap line
		// by checking if X coordinates are (nearly) the same
		const firstX = points[0].x;
		const isVertical = points.every((p) => Math.abs(p.x - firstX) < 0.5);

		if (isVertical) {
			// Vertical line - X is constant, Y varies
			const ys = points.map((p) => p.y);
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);
			// Add padding for visibility
			const padding = 10 / scale;
			return {
				x1: firstX,
				y1: minY - padding,
				x2: firstX,
				y2: maxY + padding,
				isVertical: true
			};
		} else {
			// Horizontal line - Y is constant, X varies
			const firstY = points[0].y;
			const xs = points.map((p) => p.x);
			const minX = Math.min(...xs);
			const maxX = Math.max(...xs);
			const padding = 10 / scale;
			return {
				x1: minX - padding,
				y1: firstY,
				x2: maxX + padding,
				y2: firstY,
				isVertical: false
			};
		}
	}
</script>

<g class="snap-indicators" pointer-events="none">
	{#each indicators as indicator (indicator.id)}
		{@const lineCoords = getSnapLineCoords(indicator)}
		{#if lineCoords}
			<!-- Snap line -->
			<line
				x1={lineCoords.x1}
				y1={lineCoords.y1}
				x2={lineCoords.x2}
				y2={lineCoords.y2}
				stroke={SNAP_LINE_COLOR}
				stroke-width={1 / scale}
				stroke-dasharray={`${4 / scale} ${4 / scale}`}
			/>

			<!-- Points at each snap location -->
			{#each indicator.points as point, i (`${indicator.id}-${i}`)}
				<circle cx={point.x} cy={point.y} r={SNAP_POINT_RADIUS / scale} fill={SNAP_LINE_COLOR} />
			{/each}
		{/if}
	{/each}
</g>
