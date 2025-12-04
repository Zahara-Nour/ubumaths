<script lang="ts">
	/**
	 * AsymptoteLines Component
	 *
	 * Renders asymptote lines for functions:
	 * - Vertical asymptotes: dashed vertical lines
	 * - Horizontal asymptotes: dashed horizontal lines
	 * - Oblique asymptotes: dashed diagonal lines (y = mx + b)
	 *
	 * Asymptotes are rendered behind function curves with semi-transparent colors.
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type {
		VerticalAsymptote,
		HorizontalAsymptote,
		ObliqueAsymptote,
		FunctionAnalysis
	} from '$lib/grapheur/types';
	import { analyzeAllFunctions } from '$lib/grapheur/analysis';
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
	// Analysis
	// ==========================================================================

	/**
	 * Analyze all visible functions for asymptotes.
	 * Skips analysis during interaction for performance.
	 */
	const analyses = $derived.by((): FunctionAnalysis[] => {
		// Skip during interaction for performance
		if (grapheurStore.isInteracting) return [];

		const functions = grapheurStore.visibleFunctions
			.filter((f) => f.ast)
			.map((f) => ({
				id: f.id,
				evaluator: createEvaluator(f.ast!)
			}));

		return analyzeAllFunctions(functions, grapheurStore.viewport);
	});

	/**
	 * Get function color by ID
	 */
	function getFunctionColor(functionId: string): string {
		const func = grapheurStore.visibleFunctions.find((f) => f.id === functionId);
		return func?.color ?? '#888';
	}

	// ==========================================================================
	// Rendering Helpers
	// ==========================================================================

	/**
	 * Get SVG path for a vertical asymptote line
	 */
	function getVerticalPath(asymptote: VerticalAsymptote): string {
		const svgX = transformer.mathToSvg(asymptote.x, 0).x;
		return `M ${svgX} 0 L ${svgX} ${height}`;
	}

	/**
	 * Get SVG path for a horizontal asymptote line
	 */
	function getHorizontalPath(asymptote: HorizontalAsymptote): string {
		const svgY = transformer.mathToSvg(0, asymptote.y).y;
		return `M 0 ${svgY} L ${width} ${svgY}`;
	}

	/**
	 * Get SVG path for an oblique asymptote line (y = mx + b)
	 */
	function getObliquePath(asymptote: ObliqueAsymptote): string {
		const { xMin, xMax } = grapheurStore.viewport;

		// Calculate y values at viewport edges
		const y1 = asymptote.m * xMin + asymptote.b;
		const y2 = asymptote.m * xMax + asymptote.b;

		const start = transformer.mathToSvg(xMin, y1);
		const end = transformer.mathToSvg(xMax, y2);

		return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
	}

	/**
	 * Generate tooltip text for asymptotes
	 */
	function getVerticalLabel(asymptote: VerticalAsymptote): string {
		return `x = ${asymptote.x.toPrecision(4)}`;
	}

	function getHorizontalLabel(asymptote: HorizontalAsymptote): string {
		return `y = ${asymptote.y.toPrecision(4)}`;
	}

	function getObliqueLabel(asymptote: ObliqueAsymptote): string {
		const mStr = asymptote.m.toPrecision(3);
		const bSign = asymptote.b >= 0 ? '+' : '-';
		const bStr = Math.abs(asymptote.b).toPrecision(3);
		return `y = ${mStr}x ${bSign} ${bStr}`;
	}
</script>

<g class="asymptote-lines" pointer-events="none">
	{#each analyses as analysis (analysis.functionId)}
		{@const color = getFunctionColor(analysis.functionId)}

		<!-- Vertical asymptotes -->
		{#each analysis.verticalAsymptotes as asymptote, idx (`v-${analysis.functionId}-${idx}`)}
			<path
				d={getVerticalPath(asymptote)}
				stroke={color}
				stroke-width="1.5"
				stroke-dasharray="5,5"
				fill="none"
				opacity="0.5"
			>
				<title>{getVerticalLabel(asymptote)}</title>
			</path>
		{/each}

		<!-- Horizontal asymptotes -->
		{#each analysis.horizontalAsymptotes as asymptote, idx (`h-${analysis.functionId}-${idx}`)}
			<path
				d={getHorizontalPath(asymptote)}
				stroke={color}
				stroke-width="1.5"
				stroke-dasharray="8,4"
				fill="none"
				opacity="0.5"
			>
				<title>{getHorizontalLabel(asymptote)}</title>
			</path>
		{/each}

		<!-- Oblique asymptotes -->
		{#each analysis.obliqueAsymptotes as asymptote, idx (`o-${analysis.functionId}-${idx}`)}
			<path
				d={getObliquePath(asymptote)}
				stroke={color}
				stroke-width="1.5"
				stroke-dasharray="10,3,2,3"
				fill="none"
				opacity="0.5"
			>
				<title>{getObliqueLabel(asymptote)}</title>
			</path>
		{/each}
	{/each}
</g>
