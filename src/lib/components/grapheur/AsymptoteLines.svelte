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
	import { analyzeAllFunctions, toAnalysisInputs } from '$lib/grapheur/analysis';
	import GraphLabel from './GraphLabel.svelte';
	import {
		placeAsymptoteLabels,
		branchBounds as branchBoundsOf
	} from '$lib/grapheur/asymptote-labels';

	/** Nombre de segments pour dessiner une asymptote courbe. */
	const ASYMPTOTE_CURVE_STEPS = 64;

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
	 *
	 * Note: We access grapheurStore.functions directly (not visibleFunctions)
	 * to ensure Svelte 5 properly tracks the dependency on the source array.
	 */
	const analyses = $derived.by((): FunctionAnalysis[] => {
		// Skip during interaction for performance
		if (grapheurStore.isInteracting) return [];

		return analyzeAllFunctions(
			toAnalysisInputs(grapheurStore.functions, grapheurStore.parameterBindings),
			grapheurStore.viewport
		);
	});

	/**
	 * Get function color by ID
	 */
	function getFunctionColor(functionId: string): string {
		const func = grapheurStore.functions.find((f) => f.id === functionId);
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
		const [from, to] = branchBoundsOf(asymptote.direction, transformer, width);
		// Sans cette garde, une branche entièrement hors cadre laisse un <path>
		// vide dans le DOM — et son infobulle sur un trait inexistant.
		if (to - from < 1) return '';
		return `M ${from} ${svgY} L ${to} ${svgY}`;
	}

	/**
	 * Get SVG path for an oblique asymptote line (y = mx + b)
	 */
	function getObliquePath(asymptote: ObliqueAsymptote): string {
		return polynomialPath([asymptote.b, asymptote.m], asymptote.direction);
	}

	/**
	 * Tracé d'une asymptote polynomiale, en coefficients croissants.
	 *
	 * Un polynôme de degré 1 se résume à deux points ; au-delà, on échantillonne
	 * — c'est une courbe, pas une droite.
	 */
	function polynomialPath(
		coefficients: readonly number[],
		direction: 'left' | 'right' | 'both'
	): string {
		const [fromSvg, toSvg] = branchBoundsOf(direction, transformer, width);
		if (toSvg - fromSvg < 1) return '';

		const valueAt = (x: number): number =>
			coefficients.reduce((sum, coefficient, k) => sum + coefficient * x ** k, 0);

		const steps = coefficients.length <= 2 ? 1 : ASYMPTOTE_CURVE_STEPS;
		const commands: string[] = [];
		for (let i = 0; i <= steps; i++) {
			const svgX = fromSvg + ((toSvg - fromSvg) * i) / steps;
			const mathX = transformer.svgToMath(svgX, 0).x;
			const svgY = transformer.mathToSvg(0, valueAt(mathX)).y;
			commands.push(`${i === 0 ? 'M' : 'L'} ${svgX} ${svgY}`);
		}
		return commands.join(' ');
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
			></path>
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
			></path>
		{/each}

		<!-- Asymptotes courbes (degré ≥ 2) -->
		{#each analysis.polynomialAsymptotes as asymptote, idx (`p-${analysis.functionId}-${idx}`)}
			<path
				d={polynomialPath(asymptote.coefficients, asymptote.direction)}
				stroke={color}
				stroke-width="1.5"
				stroke-dasharray="10,3,2,3"
				fill="none"
				opacity="0.5"
			></path>
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
			></path>
		{/each}
	{/each}
	<!-- Étiquettes : le <title> SVG ne pouvait pas s'afficher, la couche étant
	     en pointer-events="none" comme toutes les décorations du grapheur.
	     Le placement vit dans $lib/grapheur/asymptote-labels, où il est testé. -->
	{#each placeAsymptoteLabels(analyses, transformer, { width, height }) as label, idx (`l-${idx}`)}
		<GraphLabel
			x={label.x}
			y={label.y}
			content={{ text: label.text, latex: label.latex }}
			canvasWidth={width}
			canvasHeight={height}
		/>
	{/each}
</g>
