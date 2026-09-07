<script lang="ts">
	/**
	 * GridLines Component
	 *
	 * Renders adaptive SVG grid lines that adjust spacing based on zoom level.
	 * Supports major and minor grid lines with dark mode compatibility.
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

	/**
	 * Hard ceiling on the lines drawn along one axis.
	 *
	 * The spacing heuristic targets a few dozen, so this only ever triggers on a
	 * degenerate viewport.
	 */
	const MAX_LINES_PER_AXIS = 400;

	// ==========================================================================
	// Grid Spacing Calculation
	// ==========================================================================

	/**
	 * Calculate "nice" grid spacing based on viewport size.
	 * Uses powers of 10 multiplied by 1, 2, or 5 (human-friendly numbers).
	 *
	 * The goal is to have roughly 5-15 major grid lines visible.
	 */
	function calculateGridSpacing(range: number): { major: number; minor: number } {
		// Target: ~5-15 major grid lines
		const targetLines = 8;
		const rawSpacing = range / targetLines;

		// Find the order of magnitude
		const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));

		// Normalize to 1-10 range
		const normalized = rawSpacing / magnitude;

		// Choose "nice" number: 1, 2, 5, or 10
		let niceNumber: number;
		if (normalized <= 1.5) {
			niceNumber = 1;
		} else if (normalized <= 3) {
			niceNumber = 2;
		} else if (normalized <= 7) {
			niceNumber = 5;
		} else {
			niceNumber = 10;
		}

		const major = niceNumber * magnitude;
		// Minor grid: 5 subdivisions for nice numbers 1 and 5, 4 for 2 and 10
		const minorDivisions = niceNumber === 2 || niceNumber === 10 ? 4 : 5;
		const minor = major / minorDivisions;

		return { major, minor };
	}

	// ==========================================================================
	// Derived Grid Data
	// ==========================================================================

	/**
	 * Grid spacing, computed for each axis on its own.
	 *
	 * The two axes can carry different scales — dragging along an axis resizes
	 * it alone — so a single spacing taken from the wider range would empty the
	 * grid of its lines along the other one, while the graduations of
	 * `AxisLines` stayed right. Cells are square only when both ranges match.
	 */
	const xSpacing = $derived(calculateGridSpacing(viewport.xMax - viewport.xMin));
	const ySpacing = $derived(calculateGridSpacing(viewport.yMax - viewport.yMin));

	/**
	 * Generate vertical grid lines (x = constant).
	 *
	 * Stepping by index rather than accumulating keeps the loop finite whatever
	 * the viewport: on a window zoomed far from the origin, `x + minor` can be
	 * absorbed back to `x` and an accumulating loop never advances.
	 */
	const verticalLines = $derived.by(() => {
		const lines: { x: number; isMajor: boolean }[] = [];
		const { major, minor } = xSpacing;
		if (!Number.isFinite(minor) || minor <= 0) return lines;

		// Start from a round number before xMin
		const startX = Math.floor(viewport.xMin / minor) * minor;
		if (!Number.isFinite(startX) || startX + minor === startX) return lines;

		const count = Math.min(Math.floor((viewport.xMax - startX) / minor), MAX_LINES_PER_AXIS);

		for (let i = 0; i <= count; i++) {
			const x = startX + i * minor;
			// Check if this is a major line (within floating point tolerance)
			const isMajor = Math.abs(x / major - Math.round(x / major)) < 0.001;
			lines.push({ x, isMajor });
		}

		return lines;
	});

	/** Generate horizontal grid lines (y = constant). See {@link verticalLines}. */
	const horizontalLines = $derived.by(() => {
		const lines: { y: number; isMajor: boolean }[] = [];
		const { major, minor } = ySpacing;
		if (!Number.isFinite(minor) || minor <= 0) return lines;

		// Start from a round number before yMin
		const startY = Math.floor(viewport.yMin / minor) * minor;
		if (!Number.isFinite(startY) || startY + minor === startY) return lines;

		const count = Math.min(Math.floor((viewport.yMax - startY) / minor), MAX_LINES_PER_AXIS);

		for (let i = 0; i <= count; i++) {
			const y = startY + i * minor;
			// Check if this is a major line
			const isMajor = Math.abs(y / major - Math.round(y / major)) < 0.001;
			lines.push({ y, isMajor });
		}

		return lines;
	});
</script>

<g class="grid-lines" aria-hidden="true">
	<!-- Minor grid lines (rendered first, so major lines are on top) -->
	<g class="grid-minor">
		{#each verticalLines.filter((l) => !l.isMajor) as line (line.x)}
			{@const svgX = transformer.mathToSvg(line.x, 0).x}
			<line x1={svgX} y1={0} x2={svgX} y2={height} class="grid-line-minor" />
		{/each}
		{#each horizontalLines.filter((l) => !l.isMajor) as line (line.y)}
			{@const svgY = transformer.mathToSvg(0, line.y).y}
			<line x1={0} y1={svgY} x2={width} y2={svgY} class="grid-line-minor" />
		{/each}
	</g>

	<!-- Major grid lines -->
	<g class="grid-major">
		{#each verticalLines.filter((l) => l.isMajor) as line (line.x)}
			{@const svgX = transformer.mathToSvg(line.x, 0).x}
			<line x1={svgX} y1={0} x2={svgX} y2={height} class="grid-line-major" />
		{/each}
		{#each horizontalLines.filter((l) => l.isMajor) as line (line.y)}
			{@const svgY = transformer.mathToSvg(0, line.y).y}
			<line x1={0} y1={svgY} x2={width} y2={svgY} class="grid-line-major" />
		{/each}
	</g>
</g>

<style>
	.grid-line-minor {
		stroke: var(--graph-grid-minor, #e5e5e5);
		stroke-width: 0.5;
	}

	.grid-line-major {
		stroke: var(--graph-grid-major, #d4d4d4);
		stroke-width: 1;
	}

	/* Dark mode support */
	:global(.dark) .grid-line-minor {
		stroke: var(--graph-grid-minor-dark, #2a2a3e);
	}

	:global(.dark) .grid-line-major {
		stroke: var(--graph-grid-major-dark, #3a3a52);
	}
</style>
