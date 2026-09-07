<script lang="ts">
	/**
	 * IntegralArea Component
	 *
	 * Shades the region between a curve and the axis, over `[from ; to]`.
	 *
	 * The region is drawn from the sampled outline down to `y = 0`, so a part
	 * of the curve below the axis is shaded below it — which is what a signed
	 * integral means, and what the displayed value says.
	 *
	 * @component
	 */

	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type { IntegralResult } from '$lib/grapheur/analysis';

	// Props
	let {
		integral,
		transformer,
		color
	}: {
		integral: IntegralResult;
		transformer: CoordinateTransformer;
		color: string;
	} = $props();

	// ==========================================================================
	// Derived
	// ==========================================================================

	/**
	 * Outline of the shaded region: along the curve, then back along the axis.
	 */
	const path = $derived.by(() => {
		const { points, from, to } = integral;
		if (points.length < 2) return '';

		const start = transformer.mathToSvg(from, 0);
		const end = transformer.mathToSvg(to, 0);

		const along = points
			.map((p) => {
				const svg = transformer.mathToSvg(p.x, p.y);
				return `L ${svg.x} ${svg.y}`;
			})
			.join(' ');

		return `M ${start.x} ${start.y} ${along} L ${end.x} ${end.y} Z`;
	});
</script>

{#if path}
	<path d={path} fill={color} class="integral-area" aria-hidden="true" />
{/if}

<style>
	.integral-area {
		fill-opacity: 0.22;
		stroke: none;
		pointer-events: none;
	}
</style>
