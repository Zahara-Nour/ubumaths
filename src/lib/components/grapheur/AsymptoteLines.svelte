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
		PolynomialAsymptote,
		FunctionAnalysis
	} from '$lib/grapheur/types';
	import { analyzeAllFunctions, toAnalysisInputs } from '$lib/grapheur/analysis';
	import GraphLabel, { type GraphLabelContent } from './GraphLabel.svelte';

	/** Nombre de segments pour dessiner une asymptote courbe. */
	const ASYMPTOTE_CURVE_STEPS = 64;

	/** En deçà, un coefficient n'apparaît pas dans le libellé. */
	const POLYNOMIAL_LABEL_EPSILON = 1e-6;

	/** Marge entre l'étiquette et le bord du cadre, en pixels. */
	const LABEL_MARGIN = 8;

	/** Décalage vertical entre deux étiquettes qui se suivent. */
	const LABEL_STACK = 22;

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
		const [from, to] = branchBounds(asymptote.direction);
		// Sans cette garde, une branche entièrement hors cadre laisse un <path>
		// vide dans le DOM — et son infobulle sur un trait inexistant.
		if (to - from < 1) return '';
		return `M ${from} ${svgY} L ${to} ${svgY}`;
	}

	/**
	 * Bornes en abscisse SVG du tracé d'une asymptote, selon sa direction.
	 *
	 * Une asymptote qui n'existe que d'un côté ne doit être tracée que de ce
	 * côté : arctan a `y = π/2` en +∞ et `y = -π/2` en -∞, et les tracer toutes
	 * deux sur toute la largeur montre à l'élève deux droites dont chacune est
	 * fausse sur la moitié du repère.
	 */
	function branchBounds(direction: 'left' | 'right' | 'both'): [number, number] {
		if (direction === 'both') return [0, width];
		const origin = transformer.mathToSvg(0, 0).x;
		// Origine hors cadre : la branche occupe tout le cadre du bon côté, et
		// rien du mauvais — ce que `to - from < 1` écarte chez l'appelant.
		const cut = Math.min(Math.max(origin, 0), width);
		return direction === 'right' ? [cut, width] : [0, cut];
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
		const [fromSvg, toSvg] = branchBounds(direction);
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

	/**
	 * Étiquettes à poser, une par asymptote.
	 *
	 * Le libellé était jusqu'ici dans un `<title>` SVG — inatteignable, la
	 * couche entière étant en `pointer-events="none"` comme toutes les
	 * décorations du grapheur. Il s'affiche donc en permanence : l'élève lit
	 * `y = x + 5` sans avoir à survoler, ce qui marche aussi au tableau.
	 */
	function labelsFor(
		analysis: FunctionAnalysis
	): { x: number; y: number; content: GraphLabelContent }[] {
		const placed: { x: number; y: number; content: GraphLabelContent }[] = [];
		const occupied: number[] = [];

		/** Empile les étiquettes qui partagent une même bande horizontale. */
		const place = (anchorX: number, anchorY: number, text: string, latex: string): void => {
			const band = Math.round(anchorY / LABEL_STACK);
			const rank = occupied.filter((taken) => taken === band).length;
			occupied.push(band);
			placed.push({
				x: anchorX,
				y: anchorY + rank * LABEL_STACK,
				content: { text, latex }
			});
		};

		for (const asymptote of analysis.verticalAsymptotes) {
			const svgX = transformer.mathToSvg(asymptote.x, 0).x;
			if (svgX < 0 || svgX > width) continue;
			place(
				svgX + LABEL_MARGIN,
				LABEL_MARGIN + LABEL_STACK,
				getVerticalLabel(asymptote),
				`x = ${asymptote.x.toPrecision(4)}`
			);
		}
		for (const asymptote of analysis.horizontalAsymptotes) {
			const svgY = transformer.mathToSvg(0, asymptote.y).y;
			if (svgY < 0 || svgY > height) continue;
			const [from, to] = branchBounds(asymptote.direction);
			if (to - from < 1) continue;
			place(
				from + LABEL_MARGIN,
				svgY - LABEL_MARGIN,
				getHorizontalLabel(asymptote),
				`y = ${asymptote.y.toPrecision(4)}`
			);
		}
		for (const asymptote of analysis.obliqueAsymptotes) {
			const anchor = anchorOnBranch([asymptote.b, asymptote.m], asymptote.direction);
			if (anchor !== null)
				place(
					anchor.x,
					anchor.y,
					getObliqueLabel(asymptote),
					polynomialLatex([asymptote.b, asymptote.m])
				);
		}
		for (const asymptote of analysis.polynomialAsymptotes) {
			const anchor = anchorOnBranch(asymptote.coefficients, asymptote.direction);
			if (anchor !== null)
				place(
					anchor.x,
					anchor.y,
					getPolynomialLabel(asymptote),
					polynomialLatex(asymptote.coefficients)
				);
		}

		return placed;
	}

	/** Point d'accroche d'une étiquette sur une asymptote non horizontale. */
	function anchorOnBranch(
		coefficients: readonly number[],
		direction: 'left' | 'right' | 'both'
	): { x: number; y: number } | null {
		const [from, to] = branchBounds(direction);
		if (to - from < 1) return null;

		// Aux deux tiers de la branche : au milieu, l'étiquette tombe souvent
		// sur la courbe elle-même, qui y est collée à son asymptote.
		const svgX = from + (to - from) * 0.66;
		const mathX = transformer.svgToMath(svgX, 0).x;
		const value = coefficients.reduce((sum, c, k) => sum + c * mathX ** k, 0);
		const svgY = transformer.mathToSvg(0, value).y;
		if (svgY < 0 || svgY > height) return null;

		return { x: svgX, y: svgY - LABEL_MARGIN };
	}

	/**
	 * Forme LaTeX d'un polynôme, du plus haut degré au plus bas.
	 *
	 * `GraphLabel` rend le LaTeX quand il est fourni : l'élève lit `y = x²+3x+2`
	 * en vraies mathématiques plutôt que `y = x^2 + 3.00x + 2.00`.
	 */
	function polynomialLatex(coefficients: readonly number[]): string {
		const terms: string[] = [];

		for (let degree = coefficients.length - 1; degree >= 0; degree--) {
			const coefficient = coefficients[degree];
			if (Math.abs(coefficient) < POLYNOMIAL_LABEL_EPSILON) continue;

			const power = degree === 0 ? '' : degree === 1 ? 'x' : `x^{${degree}}`;
			const unit = degree > 0 && Math.abs(Math.abs(coefficient) - 1) < POLYNOMIAL_LABEL_EPSILON;
			const magnitude = unit ? '' : formatCoefficient(Math.abs(coefficient));
			const sign = coefficient < 0 ? '-' : terms.length === 0 ? '' : '+';
			terms.push(`${terms.length === 0 ? sign : sign}${magnitude}${power}`);
		}

		return `y = ${terms.join('') || '0'}`;
	}

	/** Un coefficient entier s'écrit sans décimale : `3`, pas `3.00`. */
	function formatCoefficient(value: number): string {
		return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(3)));
	}

	/** Libellé d'une asymptote courbe : `y = x² + 3x + 2`, du plus haut degré au plus bas. */
	function getPolynomialLabel(asymptote: PolynomialAsymptote): string {
		const terms: string[] = [];

		for (let degree = asymptote.coefficients.length - 1; degree >= 0; degree--) {
			const coefficient = asymptote.coefficients[degree];
			if (Math.abs(coefficient) < POLYNOMIAL_LABEL_EPSILON) continue;

			const magnitude = Math.abs(coefficient).toPrecision(3);
			const power = degree === 0 ? '' : degree === 1 ? 'x' : `x^${degree}`;
			const factor =
				degree > 0 && Math.abs(Math.abs(coefficient) - 1) < POLYNOMIAL_LABEL_EPSILON
					? ''
					: magnitude;
			const sign = coefficient < 0 ? '-' : terms.length === 0 ? '' : '+';
			terms.push(`${terms.length === 0 ? sign : ` ${sign} `}${factor}${power}`);
		}

		return `y = ${terms.join('') || '0'}`;
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
	     en pointer-events="none" comme toutes les décorations du grapheur. -->
	{#each analyses as analysis (analysis.functionId)}
		{#each labelsFor(analysis) as label, idx (`l-${analysis.functionId}-${idx}`)}
			<GraphLabel
				x={label.x}
				y={label.y}
				content={label.content}
				canvasWidth={width}
				canvasHeight={height}
			/>
		{/each}
	{/each}
</g>
