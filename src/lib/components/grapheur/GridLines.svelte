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
	import { computeGridStep } from '$lib/geometry-core/viewport';

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
	// Derived Grid Data
	// ==========================================================================

	/**
	 * Grid spacing, computed for each axis on its own, from its own scale.
	 *
	 * The criterion is a distance in pixels, not a number of lines: the two axes
	 * can carry different scales — dragging along an axis resizes it alone — and
	 * only a pixel distance still means something then. Cells are square when,
	 * and only when, both scales match.
	 */
	const xSpacing = $derived(computeGridStep(transformer.scaleX));
	const ySpacing = $derived(computeGridStep(transformer.scaleY));

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
		// Below one ulp at that magnitude, the axis cannot carry a step at all:
		// the requested spacing would be rounded away.
		if (!Number.isFinite(startX) || minor <= Math.abs(startX) * Number.EPSILON) return lines;

		const count = Math.min(Math.floor((viewport.xMax - startX) / minor), MAX_LINES_PER_AXIS);

		let previous = -Infinity;
		for (let i = 0; i <= count; i++) {
			const x = startX + i * minor;
			// Float resolution exhausted: the step no longer moves the value, and
			// the keyed `{#each}` below would see the same key twice.
			if (x <= previous) break;
			previous = x;

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
		if (!Number.isFinite(startY) || minor <= Math.abs(startY) * Number.EPSILON) return lines;

		const count = Math.min(Math.floor((viewport.yMax - startY) / minor), MAX_LINES_PER_AXIS);

		let previous = -Infinity;
		for (let i = 0; i <= count; i++) {
			const y = startY + i * minor;
			if (y <= previous) break;
			previous = y;

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
