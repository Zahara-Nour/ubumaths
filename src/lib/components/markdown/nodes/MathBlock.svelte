<!--
	MathBlock Component
	===================

	Renders a block-level (display) math formula using MathLive's <math-div>.
	Centered with appropriate vertical spacing.

	Uses <math-div> instead of <math-field read-only> for better performance:
	- Lazy-loaded, viewport-aware
	- Lighter weight (no editor machinery)
	- Purpose-built for static display

	Features:
	- Static MathLive rendering for display
	- Centered layout with vertical margins
	- Larger font size for display math
	- Configurable generic function recognition for derivatives (f'(x), P''(x))

	@see ExerciseDisplay.svelte for rendering context
-->
<script lang="ts">
	import 'mathlive';
	import { expressionToLatex } from '../utils/math-utils';
	import { readContentLocale } from '../content-locale';
	import { isRefusedRestrictedFormula, readRestrictedRendering } from '../restricted-rendering';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	interface Props {
		expression: string;
		syntax: 'latex' | 'custom';
		class?: string;
		/** Configuration for generic function names (f, g, h, P, Q, etc.) */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let { expression, syntax, class: className = '', genericFunctions }: Props = $props();

	// Langue du contenu (séparateur décimal), posée par MarkdownRenderer
	const contentLocale = readContentLocale();

	// Convert to LaTeX for rendering
	let latex = $derived(expressionToLatex(expression, syntax, genericFunctions, contentLocale()));

	// Mode restreint (chat élève) : une commande MathLive de style, classe,
	// identifiant, données ou lien ne part pas dans MathLive — texte (S1) ; une
	// formule trop longue ou trop imbriquée non plus (rendu de plusieurs Mo).
	// `expression` d'abord : hors bornes, `latex` n'est jamais calculé (`$derived`
	// paresseux) — sa conversion lèverait sur une entrée géante.
	const isRestricted = readRestrictedRendering();
	let unsafe = $derived(
		isRestricted() && (isRefusedRestrictedFormula(expression) || isRefusedRestrictedFormula(latex))
	);
</script>

<div class="math-block-container flex justify-center {className}">
	{#if unsafe}
		<code class="restricted-math">$${expression}$$</code>
	{:else}
		{#key latex}
			<math-div class="math-block-static">{latex}</math-div>
		{/key}
	{/if}
</div>

<style>
	/* Math block styling - centered display math */
	.math-block-container {
		margin: 1.5rem 0;
	}

	/* Reduce margin inside list items */
	:global(li) .math-block-container {
		margin: 0.25rem 0;
	}

	:global(.math-block-static) {
		display: inline-block;
		/* Slightly larger than inline math so display-mode formulas read as
		   "display style" (LaTeX convention). MathLive's <math-div> renders
		   smaller than <math-span> at the same em.

		   Use rem * --font-scale so the block math responds to the nav-bar
		   font-size buttons. The wrapping <div> isn't a <p>/<li>, so the
		   `main p, main li` scaling rule in app.css doesn't reach here. */
		font-size: calc(1.05rem * var(--font-scale, 1));
		line-height: 1.4;
	}
</style>
