<script lang="ts">
	/**
	 * SnapIndicators - Visual feedback for snap alignment
	 *
	 * Renders snap lines when elements are being dragged and snap to other elements.
	 * Shows dashed lines connecting aligned points and gap indicators for equal spacing.
	 *
	 * @module whiteboard/components/SnapIndicators
	 */

	import type { SnapIndicator, PointsSnapIndicator, GapSnapIndicator } from '../core/snapping';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Array of snap indicators to display */
		indicators: SnapIndicator[];
		/** Current canvas scale (for consistent line width) */
		scale: number;
	}

	let { indicators, scale }: Props = $props();

	// ==========================================================================
	// Derived State
	// ==========================================================================

	const pointsIndicators = $derived(
		indicators.filter((i): i is PointsSnapIndicator => i.type === 'points')
	);

	const gapIndicators = $derived(indicators.filter((i): i is GapSnapIndicator => i.type === 'gap'));

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Snap line color (blue-500) */
	const SNAP_LINE_COLOR = '#3b82f6';

	/** Gap indicator color (purple-500) */
	const GAP_LINE_COLOR = '#a855f7';

	/** Snap point indicator radius */
	const SNAP_POINT_RADIUS = 3;

	/** Arrow head size */
	const ARROW_SIZE = 6;

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

	/**
	 * Generate arrow head points for gap indicators.
	 */
	function getArrowPoints(
		x: number,
		y: number,
		direction: 'left' | 'right' | 'up' | 'down'
	): string {
		const size = ARROW_SIZE / scale;
		const halfSize = size / 2;

		switch (direction) {
			case 'right':
				return `${x},${y} ${x - size},${y - halfSize} ${x - size},${y + halfSize}`;
			case 'left':
				return `${x},${y} ${x + size},${y - halfSize} ${x + size},${y + halfSize}`;
			case 'down':
				return `${x},${y} ${x - halfSize},${y - size} ${x + halfSize},${y - size}`;
			case 'up':
				return `${x},${y} ${x - halfSize},${y + size} ${x + halfSize},${y + size}`;
		}
	}
</script>

<g class="snap-indicators" pointer-events="none">
	<!-- Point snap indicators (blue dashed lines) -->
	{#each pointsIndicators as indicator (indicator.id)}
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

	<!-- Gap snap indicators (purple lines with arrows) -->
	{#each gapIndicators as indicator (indicator.id)}
		{#each indicator.gaps as gap, gapIndex (`${indicator.id}-gap-${gapIndex}`)}
			{#if indicator.direction === 'horizontal'}
				{@const midY = (gap.breadthStart + gap.breadthEnd) / 2}
				<!-- Vertical edge lines -->
				<line
					x1={gap.startEdge}
					y1={gap.breadthStart}
					x2={gap.startEdge}
					y2={gap.breadthEnd}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<line
					x1={gap.endEdge}
					y1={gap.breadthStart}
					x2={gap.endEdge}
					y2={gap.breadthEnd}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<!-- Horizontal distance line -->
				<line
					x1={gap.startEdge}
					y1={midY}
					x2={gap.endEdge}
					y2={midY}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<!-- Arrow heads -->
				<polygon points={getArrowPoints(gap.startEdge, midY, 'left')} fill={GAP_LINE_COLOR} />
				<polygon points={getArrowPoints(gap.endEdge, midY, 'right')} fill={GAP_LINE_COLOR} />
			{:else}
				{@const midX = (gap.breadthStart + gap.breadthEnd) / 2}
				<!-- Horizontal edge lines -->
				<line
					x1={gap.breadthStart}
					y1={gap.startEdge}
					x2={gap.breadthEnd}
					y2={gap.startEdge}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<line
					x1={gap.breadthStart}
					y1={gap.endEdge}
					x2={gap.breadthEnd}
					y2={gap.endEdge}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<!-- Vertical distance line -->
				<line
					x1={midX}
					y1={gap.startEdge}
					x2={midX}
					y2={gap.endEdge}
					stroke={GAP_LINE_COLOR}
					stroke-width={1 / scale}
				/>
				<!-- Arrow heads -->
				<polygon points={getArrowPoints(midX, gap.startEdge, 'up')} fill={GAP_LINE_COLOR} />
				<polygon points={getArrowPoints(midX, gap.endEdge, 'down')} fill={GAP_LINE_COLOR} />
			{/if}
		{/each}
	{/each}
</g>
