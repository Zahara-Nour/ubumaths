<script lang="ts">
	/**
	 * AxisLines Component
	 *
	 * Renders X and Y axes with tick marks and labels.
	 * Axes pass through origin when visible, or appear at edges otherwise.
	 *
	 * @component
	 */

	import type { Viewport } from '$lib/grapheur/types';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';

	// Props
	let {
		viewport,
		transformer,
		width,
		height
	}: {
		viewport: Viewport;
		transformer: CoordinateTransformer;
		width: number;
		height: number;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Tick mark length in pixels */
	const TICK_SIZE = 6;

	/** Label offset from axis in pixels */
	const LABEL_OFFSET = 16;

	/** Minimum pixels between tick labels */
	const MIN_LABEL_SPACING = 50;

	// ==========================================================================
	// Grid Spacing (shared with GridLines logic)
	// ==========================================================================

	/**
	 * Calculate "nice" tick spacing based on viewport size.
	 */
	function calculateTickSpacing(range: number, pixelRange: number): number {
		// Target: labels at least MIN_LABEL_SPACING pixels apart
		const minMathSpacing = (range * MIN_LABEL_SPACING) / pixelRange;

		// Find order of magnitude
		const magnitude = Math.pow(10, Math.floor(Math.log10(minMathSpacing)));
		const normalized = minMathSpacing / magnitude;

		// Choose "nice" number
		let niceNumber: number;
		if (normalized <= 1) {
			niceNumber = 1;
		} else if (normalized <= 2) {
			niceNumber = 2;
		} else if (normalized <= 5) {
			niceNumber = 5;
		} else {
			niceNumber = 10;
		}

		return niceNumber * magnitude;
	}

	// ==========================================================================
	// Derived Axis Data
	// ==========================================================================

	/** X axis Y position (clamped to visible area) */
	const xAxisY = $derived.by(() => {
		// Y coordinate of X axis (y = 0)
		if (viewport.yMin > 0) {
			// Origin below viewport: axis at bottom
			return height;
		} else if (viewport.yMax < 0) {
			// Origin above viewport: axis at top
			return 0;
		} else {
			// Origin visible: axis at y = 0
			return transformer.mathToSvg(0, 0).y;
		}
	});

	/** Y axis X position (clamped to visible area) */
	const yAxisX = $derived.by(() => {
		// X coordinate of Y axis (x = 0)
		if (viewport.xMin > 0) {
			// Origin left of viewport: axis at left
			return 0;
		} else if (viewport.xMax < 0) {
			// Origin right of viewport: axis at right
			return width;
		} else {
			// Origin visible: axis at x = 0
			return transformer.mathToSvg(0, 0).x;
		}
	});

	/** Whether the origin is visible */
	const originVisible = $derived(
		viewport.xMin <= 0 && viewport.xMax >= 0 && viewport.yMin <= 0 && viewport.yMax >= 0
	);

	/** Tick spacing for X axis */
	const xTickSpacing = $derived(calculateTickSpacing(viewport.xMax - viewport.xMin, width));

	/** Tick spacing for Y axis */
	const yTickSpacing = $derived(calculateTickSpacing(viewport.yMax - viewport.yMin, height));

	/** X axis tick marks and labels */
	const xTicks = $derived.by(() => {
		const ticks: { value: number; svgX: number }[] = [];
		const startX = Math.ceil(viewport.xMin / xTickSpacing) * xTickSpacing;

		for (let x = startX; x <= viewport.xMax; x += xTickSpacing) {
			// Skip tick at origin (or very close to it)
			if (Math.abs(x) < xTickSpacing * 0.001) continue;

			const svgX = transformer.mathToSvg(x, 0).x;
			ticks.push({ value: x, svgX });
		}

		return ticks;
	});

	/** Y axis tick marks and labels */
	const yTicks = $derived.by(() => {
		const ticks: { value: number; svgY: number }[] = [];
		const startY = Math.ceil(viewport.yMin / yTickSpacing) * yTickSpacing;

		for (let y = startY; y <= viewport.yMax; y += yTickSpacing) {
			// Skip tick at origin
			if (Math.abs(y) < yTickSpacing * 0.001) continue;

			const svgY = transformer.mathToSvg(0, y).y;
			ticks.push({ value: y, svgY });
		}

		return ticks;
	});

	/**
	 * Format a number for display on axis.
	 * Removes unnecessary trailing zeros and handles small numbers.
	 */
	function formatLabel(value: number): string {
		// Handle very small numbers that should be zero
		if (Math.abs(value) < 1e-10) return '0';

		// Use fixed notation for reasonable numbers, scientific for extremes
		const absValue = Math.abs(value);
		if (absValue >= 1e6 || (absValue < 0.001 && absValue > 0)) {
			return value.toExponential(1);
		}

		// Round to avoid floating point artifacts
		const rounded = Math.round(value * 1e10) / 1e10;

		// If it's an integer, return as-is
		if (Number.isInteger(rounded)) {
			return rounded.toString();
		}

		// Otherwise, limit to 4 decimal places
		return parseFloat(rounded.toFixed(4)).toString();
	}
</script>

<g class="axes" role="presentation" aria-label="Coordinate axes">
	<!-- X axis line -->
	<line x1={0} y1={xAxisY} x2={width} y2={xAxisY} class="axis-line" aria-hidden="true" />

	<!-- Y axis line -->
	<line x1={yAxisX} y1={0} x2={yAxisX} y2={height} class="axis-line" aria-hidden="true" />

	<!-- X axis tick marks and labels -->
	<g class="x-axis-ticks" aria-hidden="true">
		{#each xTicks as tick (tick.value)}
			<!-- Tick mark -->
			<line
				x1={tick.svgX}
				y1={xAxisY - TICK_SIZE / 2}
				x2={tick.svgX}
				y2={xAxisY + TICK_SIZE / 2}
				class="tick-mark"
			/>
			<!-- Label -->
			<text
				x={tick.svgX}
				y={xAxisY + LABEL_OFFSET}
				class="axis-label"
				text-anchor="middle"
				dominant-baseline="hanging"
			>
				{formatLabel(tick.value)}
			</text>
		{/each}
	</g>

	<!-- Y axis tick marks and labels -->
	<g class="y-axis-ticks" aria-hidden="true">
		{#each yTicks as tick (tick.value)}
			<!-- Tick mark -->
			<line
				x1={yAxisX - TICK_SIZE / 2}
				y1={tick.svgY}
				x2={yAxisX + TICK_SIZE / 2}
				y2={tick.svgY}
				class="tick-mark"
			/>
			<!-- Label -->
			<text
				x={yAxisX - LABEL_OFFSET / 2}
				y={tick.svgY}
				class="axis-label"
				text-anchor="end"
				dominant-baseline="middle"
			>
				{formatLabel(tick.value)}
			</text>
		{/each}
	</g>

	<!-- Origin label (only if visible) -->
	{#if originVisible}
		<text
			x={yAxisX - LABEL_OFFSET / 2}
			y={xAxisY + LABEL_OFFSET}
			class="axis-label origin-label"
			text-anchor="end"
			dominant-baseline="hanging"
		>
			0
		</text>
	{/if}
</g>

<style>
	.axis-line {
		stroke: var(--graph-axis, #374151);
		stroke-width: 1.5;
	}

	.tick-mark {
		stroke: var(--graph-axis, #374151);
		stroke-width: 1;
	}

	.axis-label {
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
		font-size: 11px;
		fill: var(--graph-axis-label, #6b7280);
		user-select: none;
		pointer-events: none;
	}

	.origin-label {
		font-weight: 500;
	}

	/* Dark mode support */
	:global(.dark) .axis-line {
		stroke: var(--graph-axis-dark, #9ca3af);
	}

	:global(.dark) .tick-mark {
		stroke: var(--graph-axis-dark, #9ca3af);
	}

	:global(.dark) .axis-label {
		fill: var(--graph-axis-label-dark, #9ca3af);
	}
</style>
